import { ApiError } from '../lib/http.js';
import { z } from 'zod';

export function validate(schema) {
  const validator = typeof schema.safeParse === 'function' ? schema : z.object(schema);

  return (req, res, next) => {
    const result = validator.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      throw new ApiError(400, 'validation_error', 'Date invalide.', result.error.flatten());
    }

    req.validated = result.data;
    next();
  };
}
