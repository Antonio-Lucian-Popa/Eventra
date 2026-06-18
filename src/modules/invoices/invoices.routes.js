import crypto from 'node:crypto';
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
import { submitToEfactura, getEfacturaInvoiceStatus } from '../../lib/efactura.js';
import { config } from '../../config/env.js';

const router = Router();

const invoiceSchema = z.object({
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
  invoiceNumber: z.string().min(2).optional(),
  amount: money,
  status: z.enum(['unpaid', 'partially_paid', 'paid', 'cancelled']).default('unpaid'),
  dueDate: optionalDate,
  fileUrl: z.string().url().optional().nullable(),
  vatRate: z.coerce.number().min(0).max(100).optional().nullable(),
  items: z.array(z.record(z.unknown())).optional().nullable(),
});

// ─── Generate PDF ────────────────────────────────────────────────────────────
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

// ─── Submit to e-Factura / ANAF SPV ──────────────────────────────────────────
router.post(
  '/:id/submit-efactura',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: { client: true, event: true },
    });
    if (!invoice) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Factura nu a fost gasita.' } });
    }
    if (invoice.efacturaStatus === 'submitted' || invoice.efacturaStatus === 'accepted') {
      return res.status(409).json({
        error: { code: 'already_submitted', message: `Factura are deja statusul e-Factura: ${invoice.efacturaStatus}.` },
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!organization.efacturaCompanyId) {
      return res.status(422).json({
        error: {
          code: 'efactura_not_configured',
          message: 'Organizatia nu are configurat efacturaCompanyId. Adaugati-l in setarile organizatiei.',
        },
      });
    }
    if (!organization.cif) {
      return res.status(422).json({
        error: { code: 'missing_cif', message: 'CIF-ul organizatiei este necesar pentru e-Factura.' },
      });
    }

    let result;
    try {
      result = await submitToEfactura(organization.efacturaCompanyId, invoice, organization);
    } catch (err) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { efacturaStatus: 'error', efacturaError: err.message },
      });
      return res.status(502).json({
        error: { code: 'efactura_error', message: err.message, detail: err.data },
      });
    }

    if (!result.validated) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { efacturaStatus: 'error', efacturaError: JSON.stringify(result.validation) },
      });
      return res.status(422).json({ error: { code: 'validation_failed', detail: result.validation } });
    }

    const uploadIndex = String(
      result.upload?.index_incarcare ?? result.upload?.index ?? '',
    );
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        efacturaStatus: 'submitted',
        efacturaUploadIndex: uploadIndex || null,
        efacturaError: null,
      },
    });

    res.json({ data: updated, efactura: result });
  }),
);

// ─── Refresh status from e-Factura API ───────────────────────────────────────
router.get(
  '/:id/efactura-status',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
    });
    if (!invoice) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Factura nu a fost gasita.' } });
    }
    if (invoice.efacturaStatus === 'not_submitted') {
      return res.json({ data: invoice, efactura: null });
    }

    let efacturaRecords;
    try {
      efacturaRecords = await getEfacturaInvoiceStatus(invoice.invoiceNumber);
    } catch (err) {
      return res.status(502).json({ error: { code: 'efactura_error', message: err.message } });
    }

    // Mapam statusul din e-factura-api la statusul local
    const STATUS_MAP = { uploaded: 'submitted', accepted: 'accepted', rejected: 'rejected', error: 'error' };
    const remoteInv = efacturaRecords?.[0];
    if (remoteInv) {
      const newStatus = STATUS_MAP[remoteInv.status] ?? invoice.efacturaStatus;
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          efacturaStatus: newStatus,
          efacturaMessageId: remoteInv.anaf_message_id || invoice.efacturaMessageId,
          efacturaError: remoteInv.error_message || null,
        },
      });
      return res.json({ data: updated, efactura: remoteInv });
    }

    res.json({ data: invoice, efactura: null });
  }),
);

// ─── Webhook de status primit de la e-factura-api ────────────────────────────
router.post(
  '/efactura-webhook',
  asyncHandler(async (req, res) => {
    const secret = config.efactura.webhookSecret;
    if (secret) {
      const sig = req.headers['x-efactura-signature'] ?? '';
      const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(req.rawBody ?? JSON.stringify(req.body))
        .digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return res.status(401).json({ error: 'invalid signature' });
      }
    }

    const { event, data } = req.body ?? {};
    if (!event || !data) return res.status(400).json({ error: 'bad payload' });

    // invoice.submitted sau invoice.status_changed
    if ((event === 'invoice.submitted' || event === 'invoice.status_changed') && data.number) {
      const STATUS_MAP = { uploaded: 'submitted', accepted: 'accepted', rejected: 'rejected', error: 'error' };
      const newStatus = STATUS_MAP[data.status] ?? null;
      if (newStatus) {
        await prisma.invoice.updateMany({
          where: { invoiceNumber: data.number, deletedAt: null },
          data: {
            efacturaStatus: newStatus,
            ...(data.upload_index && { efacturaUploadIndex: String(data.upload_index) }),
            ...(data.anaf_message_id && { efacturaMessageId: String(data.anaf_message_id) }),
          },
        });
      }
    }

    res.json({ ok: true });
  }),
);

// ─── CRUD standard ───────────────────────────────────────────────────────────
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
