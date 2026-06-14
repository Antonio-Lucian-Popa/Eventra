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

const router = Router();

const contractSchema = z.object({
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
  contractNumber: z.string().min(2).optional(),
  status: z.enum(['draft', 'signed', 'cancelled']).default('draft'),
  signedAt: optionalDate,
  fileUrl: z.string().url().optional().nullable(),
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
