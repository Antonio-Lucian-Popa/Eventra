import { z } from 'zod';
import { createCrudRouter } from '../../utils/crud.js';
import { partialBody } from '../../utils/schemas.js';
import { requireRoles } from '../../middleware/auth.js';

const venueSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  capacity: z.coerce.number().int().positive(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
});

export default createCrudRouter({
  model: 'venue',
  createSchema: venueSchema,
  updateSchema: partialBody(venueSchema),
  listWhere: (query) =>
    query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { address: { contains: query.search, mode: 'insensitive' } }] }
      : {},
  roles: {
    create: [requireRoles('admin', 'manager')],
    update: [requireRoles('admin', 'manager')],
    delete: [requireRoles('admin')],
  },
});
