import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { createCrudRouter } from '../../utils/crud.js';
import { idParam, optionalDate, partialBody, requiredDate, money } from '../../utils/schemas.js';
import { eventAmounts } from '../../utils/accounting.js';
import { requireRoles } from '../../middleware/auth.js';

const router = Router();

const leadSchema = z.object({
  clientId: z.string().uuid(),
  eventType: z.string().min(2),
  estimatedGuests: z.coerce.number().int().positive().optional().nullable(),
  desiredDate: optionalDate,
  status: z.enum(['new', 'contacted', 'viewing', 'offer_sent', 'negotiation', 'won', 'lost']).default('new'),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.use(
  createCrudRouter({
    model: 'lead',
    createSchema: leadSchema,
    updateSchema: partialBody(leadSchema),
    include: { client: true },
    listWhere: (query) => (query.search ? { eventType: { contains: query.search, mode: 'insensitive' } } : {}),
    roles: {
      create: [requireRoles('admin', 'manager')],
      update: [requireRoles('admin', 'manager')],
      delete: [requireRoles('admin')],
    },
  }),
);

const convertSchema = z.object({
  venueId: z.string().uuid(),
  title: z.string().min(2).optional(),
  eventType: z.enum(['wedding', 'baptism', 'birthday', 'corporate', 'other']).optional(),
  eventDate: requiredDate.optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  guestsCount: z.coerce.number().int().positive().optional(),
  totalAmount: money.default(0),
  depositAmount: money.default(0),
  notes: z.string().optional().nullable(),
});

router.post(
  '/:id/convert-to-event',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: convertSchema, query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: { client: true },
    });
    if (!lead) throw new ApiError(404, 'not_found', 'Lead-ul nu a fost gasit.');
    if (!lead.desiredDate && !req.validated.body.eventDate) {
      throw new ApiError(400, 'validation_error', 'eventDate este obligatoriu daca lead-ul nu are desiredDate.');
    }

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          clientId: lead.clientId,
          organizationId: req.user.organizationId,
          venueId: req.validated.body.venueId,
          title: req.validated.body.title || `${lead.eventType} - ${lead.client.fullName}`,
          eventType: req.validated.body.eventType || 'other',
          eventDate: req.validated.body.eventDate || lead.desiredDate,
          startTime: req.validated.body.startTime,
          endTime: req.validated.body.endTime,
          guestsCount: req.validated.body.guestsCount || lead.estimatedGuests || 1,
          notes: req.validated.body.notes || lead.notes,
          ...eventAmounts(req.validated.body),
        },
      });
      await tx.lead.update({ where: { id: lead.id }, data: { status: 'won' } });
      return created;
    });

    sendCreated(res, event);
  }),
);

export default router;
