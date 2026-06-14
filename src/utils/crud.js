import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler, sendCreated } from '../lib/http.js';
import { validate } from '../middleware/validate.js';
import { idParam, listQuery } from './schemas.js';
import { audit } from '../lib/audit.js';

function pagination(query) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function createCrudRouter({
  model,
  createSchema,
  updateSchema,
  include,
  listWhere = () => ({}),
  createData = (body) => body,
  updateData = (body) => body,
  afterCreate,
  afterUpdate,
  tenantScoped = true,
  softDelete = true,
  roles,
}) {
  const router = Router();
  const client = prisma[model];

  router.get(
    '/',
    validate({ query: listQuery, params: idParam.partial(), body: createSchema.partial().optional() }),
    asyncHandler(async (req, res) => {
      const { skip, take, page, pageSize } = pagination(req.validated.query);
      const where = {
        ...(tenantScoped ? { organizationId: req.user.organizationId } : {}),
        ...(softDelete ? { deletedAt: null } : {}),
        ...listWhere(req.validated.query, req),
      };
      const [items, total] = await Promise.all([
        client.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take }),
        client.count({ where }),
      ]);
      res.json({ data: items, meta: { page, pageSize, total } });
    }),
  );

  router.post(
    '/',
    ...(roles?.create || []),
    validate({ body: createSchema, params: idParam.partial(), query: listQuery.partial() }),
    asyncHandler(async (req, res) => {
      const data = await createData(req.validated.body, req);
      if (tenantScoped) data.organizationId = req.user.organizationId;
      const item = await client.create({ data, include });
      if (afterCreate) await afterCreate(item, req);
      await audit(req, { action: 'create', entity: model, entityId: item.id, metadata: { body: req.validated.body } });
      sendCreated(res, item);
    }),
  );

  router.get(
    '/:id',
    validate({ params: idParam, query: listQuery.partial(), body: createSchema.partial().optional() }),
    asyncHandler(async (req, res) => {
      const item = await client.findFirst({
        where: {
          id: req.validated.params.id,
          ...(tenantScoped ? { organizationId: req.user.organizationId } : {}),
          ...(softDelete ? { deletedAt: null } : {}),
        },
        include,
      });
      if (!item) throw new ApiError(404, 'not_found', 'Resursa nu a fost gasita.');
      res.json({ data: item });
    }),
  );

  router.patch(
    '/:id',
    ...(roles?.update || []),
    validate({ params: idParam, body: updateSchema, query: listQuery.partial() }),
    asyncHandler(async (req, res) => {
      const data = await updateData(req.validated.body, req);
      const existing = await client.findFirst({
        where: {
          id: req.validated.params.id,
          ...(tenantScoped ? { organizationId: req.user.organizationId } : {}),
          ...(softDelete ? { deletedAt: null } : {}),
        },
        select: { id: true },
      });
      if (!existing) throw new ApiError(404, 'not_found', 'Resursa nu a fost gasita.');
      const item = await client.update({ where: { id: req.validated.params.id }, data, include });
      if (afterUpdate) await afterUpdate(item, req);
      await audit(req, { action: 'update', entity: model, entityId: item.id, metadata: { body: req.validated.body } });
      res.json({ data: item });
    }),
  );

  router.delete(
    '/:id',
    ...(roles?.delete || []),
    validate({ params: idParam, query: listQuery.partial(), body: createSchema.partial().optional() }),
    asyncHandler(async (req, res) => {
      const existing = await client.findFirst({
        where: {
          id: req.validated.params.id,
          ...(tenantScoped ? { organizationId: req.user.organizationId } : {}),
          ...(softDelete ? { deletedAt: null } : {}),
        },
        select: { id: true },
      });
      if (!existing) throw new ApiError(404, 'not_found', 'Resursa nu a fost gasita.');
      if (softDelete) {
        await client.update({ where: { id: req.validated.params.id }, data: { deletedAt: new Date() } });
      } else {
        await client.delete({ where: { id: req.validated.params.id } });
      }
      await audit(req, { action: softDelete ? 'soft_delete' : 'delete', entity: model, entityId: req.validated.params.id });
      res.status(204).send();
    }),
  );

  return router;
}
