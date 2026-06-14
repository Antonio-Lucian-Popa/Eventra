import { z } from 'zod';
import { createCrudRouter } from '../../utils/crud.js';
import { partialBody } from '../../utils/schemas.js';

const clientSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default createCrudRouter({
  model: 'client',
  createSchema: clientSchema,
  updateSchema: partialBody(clientSchema),
  listWhere: (query) =>
    query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {},
});
