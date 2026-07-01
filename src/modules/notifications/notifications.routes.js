import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles } from '../../middleware/auth.js';
import { sendPushToUsers } from '../../lib/push.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const deviceSchema = z.object({
  token: z.string().min(8),
  platform: z.enum(['expo', 'fcm', 'apns', 'web']).default('expo'),
});

// Aplicatia mobila a lucratorului isi inregistreaza token-ul de push.
router.post(
  '/devices',
  validate({ body: deviceSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const device = await prisma.deviceToken.upsert({
      where: { token: req.validated.body.token },
      update: { userId: req.user.id, platform: req.validated.body.platform },
      create: { userId: req.user.id, token: req.validated.body.token, platform: req.validated.body.platform },
    });
    sendCreated(res, device);
  }),
);

// Dezinregistrare (logout de pe device).
router.delete(
  '/devices/:token',
  validate({ params: z.object({ token: z.string().min(8) }), body: z.object({}).optional(), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    await prisma.deviceToken.deleteMany({ where: { token: req.params.token, userId: req.user.id } });
    res.status(204).send();
  }),
);

function dayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// Trimite push catre lucratorii care lucreaza intr-o anumita zi (implicit maine).
// Lucratorii sunt cei asignati pe task-urile evenimentelor din ziua respectiva.
router.post(
  '/notify-tomorrow',
  requireRoles('admin', 'manager'),
  validate({
    params: z.object({}),
    body: z.object({ date: z.coerce.date().optional() }).default({}),
    query: z.object({}),
  }),
  asyncHandler(async (req, res) => {
    const target = req.validated.body.date || new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { start, end } = dayRange(target);

    const events = await prisma.event.findMany({
      where: {
        organizationId: req.user.organizationId,
        deletedAt: null,
        eventDate: { gte: start, lt: end },
      },
      include: { venue: true, tasks: { where: { deletedAt: null, assignedTo: { not: null } }, select: { assignedTo: true } } },
      orderBy: { startTime: 'asc' },
    });

    const workerIds = [...new Set(events.flatMap((event) => event.tasks.map((task) => task.assignedTo)))];
    const dateLabel = start.toLocaleDateString('ro-RO');

    if (!workerIds.length) {
      return res.json({ data: { events: events.length, notifiedWorkers: 0, dateLabel } });
    }

    const title = events.length === 1 ? `Maine lucrezi la ${events[0].title}` : `Ai ${events.length} evenimente pe ${dateLabel}`;
    const body = events
      .map((event) => `${event.startTime ? `${event.startTime} - ` : ''}${event.title}${event.venue ? ` @ ${event.venue.name}` : ''}`)
      .join('\n');

    const result = await sendPushToUsers(workerIds, {
      title,
      body,
      data: { type: 'schedule', date: start.toISOString() },
    });
    await audit(req, { action: 'notify_schedule', entity: 'event', metadata: { date: dateLabel, workers: workerIds.length } });

    res.json({ data: { events: events.length, notifiedWorkers: workerIds.length, dateLabel, push: result } });
  }),
);

export default router;
