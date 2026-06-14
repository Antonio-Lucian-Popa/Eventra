import { Prisma } from '@prisma/client';
import { ApiError } from '../lib/http.js';

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Ruta inexistenta.' } });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { code: 'duplicate', message: 'Resursa exista deja.', details: err.meta } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'not_found', message: 'Resursa nu a fost gasita.' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: { code: 'relation_conflict', message: 'Resursa este folosita in alte inregistrari.' } });
    }
  }

  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'A aparut o eroare interna.' } });
}
