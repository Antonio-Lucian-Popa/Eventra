import { logger } from '../lib/logger.js';

/** Wraps async route handlers so thrown errors reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** A simple typed error you can throw from services. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Stripe SDK errors carry a `type` and (usually) a statusCode
  if (err && err.type && String(err.type).startsWith('Stripe')) {
    logger.warn({ err: { type: err.type, message: err.message } }, 'Eroare Stripe');
    return res.status(err.statusCode || 402).json({
      error: { code: err.code || err.type, message: err.message },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  logger.error({ err }, 'Eroare interna neasteptata');
  res.status(500).json({ error: { code: 'internal_error', message: 'A aparut o eroare interna.' } });
}
