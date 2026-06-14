import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { createCrudRouter } from '../../utils/crud.js';
import { idParam, money, optionalDate, partialBody } from '../../utils/schemas.js';
import { requireRoles } from '../../middleware/auth.js';

const router = Router();

const offerSchema = z.object({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid(),
  eventType: z.enum(['wedding', 'baptism', 'birthday', 'corporate', 'other']),
  guestsCount: z.coerce.number().int().positive(),
  selectedPackage: z.string().min(2),
  totalAmount: money,
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).default('draft'),
  validUntil: optionalDate,
});

router.post(
  '/:id/accept',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const offer = await prisma.offer.update({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      data: { status: 'accepted' },
      include: { client: true, venue: true, event: true },
    });
    res.json({ data: offer });
  }),
);

router.use(
  createCrudRouter({
    model: 'offer',
    createSchema: offerSchema,
    updateSchema: partialBody(offerSchema),
    include: { client: true, venue: true, event: true },
    roles: {
      create: [requireRoles('admin', 'manager')],
      update: [requireRoles('admin', 'manager')],
      delete: [requireRoles('admin')],
    },
  }),
);

export default router;
