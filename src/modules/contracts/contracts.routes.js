import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { createCrudRouter } from '../../utils/crud.js';
import { idParam, optionalDate, partialBody } from '../../utils/schemas.js';
import { nextNumber } from '../../lib/numbering.js';
import { generateContractPdf } from '../../lib/pdf.js';
import { sendCreated } from '../../lib/http.js';
import { requireRoles } from '../../middleware/auth.js';
import { config } from '../../config/env.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const contractSchema = z.object({
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
  contractNumber: z.string().min(2).optional(),
  status: z.enum(['draft', 'signed', 'cancelled']).default('draft'),
  signedAt: optionalDate,
  fileUrl: z.string().url().optional().nullable(),
});

// Semnatura clientului trebuie sa fie un data URL PNG/JPEG (canvas -> toDataURL).
const signSchema = z.object({
  signatureData: z.string().regex(/^data:image\/(png|jpe?g);base64,/, 'Semnatura trebuie sa fie o imagine base64.'),
  signerName: z.string().min(2),
});

router.post(
  '/:id/mark-signed',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({ signedAt: optionalDate }).default({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.update({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      data: { status: 'signed', signedAt: req.validated.body.signedAt || new Date() },
      include: { client: true, event: true },
    });
    res.json({ data: contract });
  }),
);

// Semnare in aplicatie: clientul semneaza pe ecran, salvam semnatura, marcam
// contractul ca semnat si regeneram PDF-ul cu semnatura inclusa.
router.post(
  '/:id/sign',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: signSchema, query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.contract.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: { code: 'not_found', message: 'Contractul nu a fost gasit.' } });

    const signedContract = await prisma.contract.update({
      where: { id: existing.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signatureData: req.validated.body.signatureData,
        signerName: req.validated.body.signerName,
        signerIp: req.ip,
      },
      include: { client: true, event: { include: { venue: true } } },
    });

    const fileUrl = generateContractPdf(signedContract);
    const updated = await prisma.contract.update({
      where: { id: signedContract.id },
      data: { fileUrl },
      include: { client: true, event: true },
    });
    await audit(req, { action: 'sign', entity: 'contract', entityId: updated.id, metadata: { signerName: req.validated.body.signerName } });
    res.json({ data: updated });
  }),
);

// Genereaza factura pe baza contractului (foloseste sumele evenimentului asociat).
router.post(
  '/:id/create-invoice',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({}).default({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: { event: true },
    });
    if (!contract) return res.status(404).json({ error: { code: 'not_found', message: 'Contractul nu a fost gasit.' } });

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextNumber(tx, req.user.organizationId, 'invoice');
      return tx.invoice.create({
        data: {
          organizationId: req.user.organizationId,
          eventId: contract.eventId,
          clientId: contract.clientId,
          invoiceNumber,
          amount: contract.event.totalAmount,
          vatRate: config.efactura.defaultVatRate,
          status: 'unpaid',
        },
        include: { client: true, event: true },
      });
    });
    await audit(req, { action: 'create_from_contract', entity: 'invoice', entityId: invoice.id, metadata: { contractId: contract.id } });
    sendCreated(res, invoice);
  }),
);

router.post(
  '/:id/generate-pdf',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: { client: true, event: { include: { venue: true } } },
    });
    if (!contract) return res.status(404).json({ error: { code: 'not_found', message: 'Contractul nu a fost gasit.' } });
    const fileUrl = generateContractPdf(contract);
    const updated = await prisma.contract.update({ where: { id: contract.id }, data: { fileUrl } });
    sendCreated(res, updated);
  }),
);

router.use(
  createCrudRouter({
    model: 'contract',
    createSchema: contractSchema,
    updateSchema: partialBody(contractSchema),
    include: { client: true, event: true },
    roles: {
      create: [requireRoles('admin', 'manager')],
      update: [requireRoles('admin', 'manager')],
      delete: [requireRoles('admin')],
    },
    createData: async (body, req) =>
      prisma.$transaction(async (tx) => ({
        ...body,
        contractNumber: body.contractNumber || (await nextNumber(tx, req.user.organizationId, 'contract')),
      })),
  }),
);

export default router;
