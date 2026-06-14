import { config } from '../config/env.js';

/**
 * Authenticates service-to-service calls via an API key.
 * Accepts the key in either:
 *   - Authorization: Bearer <key>
 *   - x-api-key: <key>
 *
 * On success, attaches req.app_name (the name mapped to that key) so we can
 * tag Stripe objects and route webhooks back to the right application.
 */
export function apiKeyAuth(req, res, next) {
  let key = null;

  const authHeader = req.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    key = authHeader.slice('Bearer '.length).trim();
  }
  if (!key) key = req.get('x-api-key');

  if (!key) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Lipseste cheia API.' } });
  }

  const appName = config.auth.keyToApp[key];
  if (!appName) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Cheie API invalida.' } });
  }

  req.app_name = appName;
  next();
}
