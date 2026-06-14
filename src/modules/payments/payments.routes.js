import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { ApiError, asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { createCrudRouter } from '../../utils/crud.js';
import { idParam, money, optionalDate, partialBody } from '../../utils/schemas.js';
import { recalculateEventPayments, recalculateInvoiceStatus } from '../../utils/accounting.js';
import { requireRoles } from '../../middleware/auth.js';

const router = Router();

const paymentSchema = z.object({
  eventId: z.string().uuid(),
  invoiceId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid(),
  amount: money,
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'stripe']),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).default('pending'),
  externalPaymentId: z.string().optional().nullable(),
  paidAt: optionalDate,
});

async function createPaymentAndRecalculate(data) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data });
    if (payment.status === 'succeeded') {
      await recalculateEventPayments(tx, payment.eventId);
      await recalculateInvoiceStatus(tx, payment.invoiceId);
    }
    return payment;
  });
}

router.post(
  '/create-checkout-session',
  requireRoles('admin', 'manager'),
  validate({
    params: z.object({}),
    query: z.object({}),
    body: z.object({
      eventId: z.string().uuid(),
      invoiceId: z.string().uuid().optional().nullable(),
      clientId: z.string().uuid(),
      amount: money,
      description: z.string().optional(),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    if (!config.stripeService.url || !config.stripeService.apiKey) {
      throw new ApiError(503, 'stripe_service_unconfigured', 'Serviciul Stripe nu este configurat.');
    }

    const [event, client, invoice] = await Promise.all([
      prisma.event.findFirst({ where: { id: req.validated.body.eventId, organizationId: req.user.organizationId, deletedAt: null } }),
      prisma.client.findFirst({ where: { id: req.validated.body.clientId, organizationId: req.user.organizationId, deletedAt: null } }),
      req.validated.body.invoiceId
        ? prisma.invoice.findFirst({ where: { id: req.validated.body.invoiceId, organizationId: req.user.organizationId, deletedAt: null } })
        : Promise.resolve(null),
    ]);
    if (!event || !client || (req.validated.body.invoiceId && !invoice)) {
      throw new ApiError(400, 'invalid_payment_relations', 'Eventul, clientul sau factura nu apartin organizatiei curente.');
    }

    const payment = await createPaymentAndRecalculate({
      eventId: req.validated.body.eventId,
      invoiceId: req.validated.body.invoiceId,
      clientId: req.validated.body.clientId,
      amount: req.validated.body.amount,
      organizationId: req.user.organizationId,
      paymentMethod: 'stripe',
      status: 'pending',
    });

    const amountInMinorUnits = Math.round(Number(req.validated.body.amount) * 100);
    const response = await fetch(`${config.stripeService.url}/v1/checkout/session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.stripeService.apiKey,
      },
      body: JSON.stringify({
        mode: 'payment',
        customerEmail: undefined,
        successUrl: req.validated.body.successUrl || config.stripeService.successUrl,
        cancelUrl: req.validated.body.cancelUrl || config.stripeService.cancelUrl,
        clientReferenceId: payment.id,
        items: [
          {
            name: req.validated.body.description || `Plata eveniment ${req.validated.body.eventId}`,
            amount: amountInMinorUnits,
            currency: 'ron',
            quantity: 1,
          },
        ],
        metadata: {
          app: 'eveniment-app',
          paymentId: payment.id,
          eventId: payment.eventId,
          invoiceId: payment.invoiceId || '',
          clientId: payment.clientId,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(502, 'stripe_service_error', 'Serviciul Stripe a refuzat cererea.', payload);
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { externalPaymentId: payload.id } });
    sendCreated(res, { payment: { ...payment, externalPaymentId: payload.id }, checkoutSession: payload });
  }),
);

router.use(
  createCrudRouter({
    model: 'payment',
    createSchema: paymentSchema,
    updateSchema: partialBody(paymentSchema),
    include: { client: true, event: true, invoice: true },
    roles: {
      create: [requireRoles('admin', 'manager')],
      update: [requireRoles('admin', 'manager')],
      delete: [requireRoles('admin')],
    },
    afterCreate: async (payment) => {
      if (payment.status === 'succeeded') {
        await prisma.$transaction(async (tx) => {
          await recalculateEventPayments(tx, payment.eventId);
          await recalculateInvoiceStatus(tx, payment.invoiceId);
        });
      }
    },
    afterUpdate: async (payment) => {
      await prisma.$transaction(async (tx) => {
        await recalculateEventPayments(tx, payment.eventId);
        await recalculateInvoiceStatus(tx, payment.invoiceId);
      });
    },
  }),
);

export default router;
