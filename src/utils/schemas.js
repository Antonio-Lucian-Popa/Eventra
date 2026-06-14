import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid() });
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const optionalDate = z.preprocess((value) => (value ? new Date(String(value)) : undefined), z.date().optional());
export const requiredDate = z.preprocess((value) => new Date(String(value)), z.date());
export const money = z.coerce.number().min(0);

export function partialBody(schema) {
  return schema.partial().refine((value) => Object.keys(value).length > 0, 'Cel putin un camp este obligatoriu.');
}
