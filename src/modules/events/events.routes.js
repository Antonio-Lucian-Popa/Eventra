import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { createCrudRouter } from '../../utils/crud.js';
import { eventAmounts } from '../../utils/accounting.js';
import { idParam, listQuery, optionalDate, partialBody, requiredDate, money } from '../../utils/schemas.js';
import { assertNoVenueConflict } from '../../lib/businessRules.js';
import { requireRoles } from '../../middleware/auth.js';

const router = Router();

const eventSchema = z.object({
  clientId: z.string().uuid(),
  venueId: z.string().uuid(),
  title: z.string().min(2),
  eventType: z.enum(['wedding', 'baptism', 'birthday', 'corporate', 'other']),
  eventDate: requiredDate,
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  guestsCount: z.coerce.number().int().positive(),
  status: z.enum(['draft', 'confirmed', 'in_preparation', 'completed', 'cancelled']).default('draft'),
  totalAmount: money.default(0),
  depositAmount: money.default(0),
  paidAmount: money.default(0),
  notes: z.string().optional().nullable(),
});

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  dueDate: optionalDate,
  assignedTo: z.string().uuid().optional().nullable(),
});

router.get(
  '/calendar',
  validate({
    params: z.object({}),
    body: z.object({}).optional(),
    query: z.object({
      startDate: requiredDate,
      endDate: requiredDate,
      venueId: z.string().uuid().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, venueId } = req.validated.query;
    const events = await prisma.event.findMany({
      where: {
        organizationId: req.user.organizationId,
        deletedAt: null,
        eventDate: { gte: startDate, lte: endDate },
        ...(venueId ? { venueId } : {}),
      },
      include: { client: true, venue: true },
      orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ data: events });
  }),
);

router.get(
  '/:id/tasks',
  requireRoles('admin', 'manager', 'staff'),
  validate({ params: idParam, query: listQuery.partial(), body: z.object({}).optional() }),
  asyncHandler(async (req, res) => {
    const tasks = await prisma.eventTask.findMany({
      where: { organizationId: req.user.organizationId, eventId: req.validated.params.id, deletedAt: null },
      include: { assignee: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ data: tasks });
  }),
);

router.post(
  '/:id/tasks',
  requireRoles('admin', 'manager', 'staff'),
  validate({ params: idParam, body: taskSchema, query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const task = await prisma.eventTask.create({
      data: { ...req.validated.body, organizationId: req.user.organizationId, eventId: req.validated.params.id },
    });
    sendCreated(res, task);
  }),
);

router.use(
  createCrudRouter({
    model: 'event',
    createSchema: eventSchema,
    updateSchema: partialBody(eventSchema),
    include: { client: true, venue: true },
    createData: async (body, req) => {
      await assertNoVenueConflict({ ...body, organizationId: req.user.organizationId });
      return { ...body, ...eventAmounts(body) };
    },
    updateData: async (body, req) => {
      const current = await prisma.event.findUniqueOrThrow({
        where: { id: req.validated.params.id },
        select: {
          organizationId: true,
          venueId: true,
          eventDate: true,
          startTime: true,
          endTime: true,
          totalAmount: true,
          paidAmount: true,
          depositAmount: true,
        },
      });
      if (body.venueId || body.eventDate || body.startTime || body.endTime) {
        await assertNoVenueConflict({
          organizationId: req.user.organizationId,
          venueId: body.venueId || current.venueId,
          eventDate: body.eventDate || current.eventDate,
          startTime: body.startTime ?? current.startTime,
          endTime: body.endTime ?? current.endTime,
          ignoreEventId: req.validated.params.id,
        });
      }
      if (body.totalAmount == null && body.paidAmount == null && body.depositAmount == null) return body;
      const merged = { ...current, ...body };
      return { ...body, ...eventAmounts(merged) };
    },
    listWhere: (query) =>
      query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {},
    roles: {
      create: [requireRoles('admin', 'manager')],
      update: [requireRoles('admin', 'manager')],
      delete: [requireRoles('admin')],
    },
  }),
);

export default router;
