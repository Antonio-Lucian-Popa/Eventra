import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { createCrudRouter } from '../../utils/crud.js';
import { idParam, money, optionalDate, partialBody } from '../../utils/schemas.js';
import { nextNumber } from '../../lib/numbering.js';
import { generateInvoicePdf } from '../../lib/pdf.js';
import { asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles } from '../../middleware/auth.js';

const router = Router();

const invoiceSchema = z.object({
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
  invoiceNumber: z.string().min(2).optional(),
  amount: money,
  status: z.enum(['unpaid', 'partially_paid', 'paid', 'cancelled']).default('unpaid'),
  dueDate: optionalDate,
  fileUrl: z.string().url().optional().nullable(),
});

router.post(
  '/:id/generate-pdf',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: { client: true, event: true },
    });
    if (!invoice) return res.status(404).json({ error: { code: 'not_found', message: 'Factura nu a fost gasita.' } });
    const fileUrl = generateInvoicePdf(invoice);
    const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { fileUrl } });
    sendCreated(res, updated);
  }),
);

router.use(
  createCrudRouter({
    model: 'invoice',
    createSchema: invoiceSchema,
    updateSchema: partialBody(invoiceSchema),
    include: { client: true, event: true, payments: true },
    roles: {
      create: [requireRoles('admin', 'manager')],
      update: [requireRoles('admin', 'manager')],
      delete: [requireRoles('admin')],
    },
    createData: async (body, req) =>
      prisma.$transaction(async (tx) => ({
        ...body,
        invoiceNumber: body.invoiceNumber || (await nextNumber(tx, req.user.organizationId, 'invoice')),
      })),
  }),
);

export default router;
