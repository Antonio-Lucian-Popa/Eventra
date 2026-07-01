import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireRoles } from '../../middleware/auth.js';
import { listQuery } from '../../utils/schemas.js';
import { audit } from '../../lib/audit.js';

const router = Router();

router.get('/me', (req, res) => {
  res.json({ data: req.user.organization });
});

router.patch(
  '/me',
  requireRoles('admin'),
  validate({
    params: z.object({}),
    query: z.object({}),
    body: z.object({ name: z.string().min(2).optional(), slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional() }),
  }),
  asyncHandler(async (req, res) => {
    const organization = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: req.validated.body,
      select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
    });
    await audit(req, { action: 'update', entity: 'organization', entityId: organization.id, metadata: req.validated.body });
    res.json({ data: organization });
  }),
);

router.get(
  '/users',
  requireRoles('admin', 'manager'),
  validate({ params: z.object({}), query: listQuery.partial(), body: z.object({}).optional() }),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, teamId: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  }),
);

router.get(
  '/audit-logs',
  requireRoles('admin'),
  validate({ params: z.object({}), query: listQuery, body: z.object({}).optional() }),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.validated.query;
    const skip = (page - 1) * pageSize;
    const where = { organizationId: req.user.organizationId };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data: items, meta: { page, pageSize, total } });
  }),
);

export default router;
