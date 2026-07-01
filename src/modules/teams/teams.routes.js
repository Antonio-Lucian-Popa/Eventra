import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles } from '../../middleware/auth.js';
import { idParam, listQuery } from '../../utils/schemas.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const memberSelect = { id: true, name: true, email: true, role: true };
const teamInclude = {
  lead: { select: memberSelect },
  members: { where: { deletedAt: null }, select: memberSelect, orderBy: { name: 'asc' } },
  _count: { select: { events: true } },
};

const teamSchema = z.object({
  name: z.string().min(2),
  leadId: z.string().uuid().optional().nullable(),
});

async function assertUserInOrg(userId, organizationId) {
  if (!userId) return;
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId, deletedAt: null }, select: { id: true } });
  if (!user) throw new ApiError(422, 'invalid_user', 'Utilizatorul nu apartine organizatiei.');
}

router.get(
  '/',
  validate({ query: listQuery.partial(), params: z.object({}), body: z.object({}).optional() }),
  asyncHandler(async (req, res) => {
    const teams = await prisma.team.findMany({
      where: { organizationId: req.user.organizationId, deletedAt: null },
      include: teamInclude,
      orderBy: { name: 'asc' },
    });
    res.json({ data: teams });
  }),
);

router.get(
  '/:id',
  validate({ params: idParam, query: listQuery.partial(), body: z.object({}).optional() }),
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: teamInclude,
    });
    if (!team) throw new ApiError(404, 'not_found', 'Echipa nu a fost gasita.');
    res.json({ data: team });
  }),
);

router.post(
  '/',
  requireRoles('admin', 'manager'),
  validate({ body: teamSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    await assertUserInOrg(req.validated.body.leadId, req.user.organizationId);
    const team = await prisma.team.create({
      data: { ...req.validated.body, organizationId: req.user.organizationId },
      include: teamInclude,
    });
    await audit(req, { action: 'create', entity: 'team', entityId: team.id, metadata: { name: team.name } });
    sendCreated(res, team);
  }),
);

router.patch(
  '/:id',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: teamSchema.partial(), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.team.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, 'not_found', 'Echipa nu a fost gasita.');
    await assertUserInOrg(req.validated.body.leadId, req.user.organizationId);
    const team = await prisma.team.update({ where: { id: existing.id }, data: req.validated.body, include: teamInclude });
    await audit(req, { action: 'update', entity: 'team', entityId: team.id, metadata: req.validated.body });
    res.json({ data: team });
  }),
);

// Seteaza componenta echipei (membrii). Scoate userii care nu mai sunt in lista
// si adauga userii selectati. Un user apartine unei singure echipe.
router.put(
  '/:id/members',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, body: z.object({ userIds: z.array(z.string().uuid()) }), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!team) throw new ApiError(404, 'not_found', 'Echipa nu a fost gasita.');

    const { userIds } = req.validated.body;
    // Validam ca toti userii apartin organizatiei.
    const valid = await prisma.user.findMany({
      where: { id: { in: userIds }, organizationId: req.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    const validIds = valid.map((u) => u.id);

    await prisma.$transaction([
      // Scoatem membrii actuali care nu mai sunt in lista.
      prisma.user.updateMany({
        where: { teamId: team.id, id: { notIn: validIds.length ? validIds : ['00000000-0000-0000-0000-000000000000'] } },
        data: { teamId: null },
      }),
      // Ii adaugam pe cei selectati.
      prisma.user.updateMany({ where: { id: { in: validIds } }, data: { teamId: team.id } }),
    ]);

    const updated = await prisma.team.findUnique({ where: { id: team.id }, include: teamInclude });
    await audit(req, { action: 'set_members', entity: 'team', entityId: team.id, metadata: { count: validIds.length } });
    res.json({ data: updated });
  }),
);

router.delete(
  '/:id',
  requireRoles('admin', 'manager'),
  validate({ params: idParam, query: z.object({}), body: z.object({}).optional() }),
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findFirst({
      where: { id: req.validated.params.id, organizationId: req.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!team) throw new ApiError(404, 'not_found', 'Echipa nu a fost gasita.');
    await prisma.$transaction([
      prisma.user.updateMany({ where: { teamId: team.id }, data: { teamId: null } }),
      prisma.team.update({ where: { id: team.id }, data: { deletedAt: new Date() } }),
    ]);
    await audit(req, { action: 'soft_delete', entity: 'team', entityId: team.id });
    res.status(204).send();
  }),
);

export default router;
