import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { isDbEnabled } from './lib/db.js';
import { apiKeyAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import webhookRoutes from './routes/webhook.routes.js';
import productRoutes from './routes/product.routes.js';
import customerRoutes from './routes/customer.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import portalRoutes from './routes/portal.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(pinoHttp({ logger }));
  app.use(cors({ origin: config.cors.origins }));

  // Health check (no auth, no body parsing).
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: isDbEnabled() ? 'enabled' : 'disabled', time: new Date().toISOString() });
  });

  // IMPORTANT: webhooks must be registered BEFORE express.json() so the route
  // can read the raw body for Stripe signature verification.
  app.use('/webhooks', webhookRoutes);

  // Everything below parses JSON.
  app.use(express.json({ limit: '1mb' }));

  // Rate limit the authenticated API surface.
  const limiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });

  // Authenticated v1 API.
  app.use('/v1', limiter, apiKeyAuth);
  app.use('/v1/products', productRoutes);
  app.use('/v1/customers', customerRoutes);
  app.use('/v1/checkout', checkoutRoutes);
  app.use('/v1/subscriptions', subscriptionRoutes);
  app.use('/v1/portal', portalRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Ruta inexistenta.' } });
  });

  app.use(errorHandler);
  return app;
}
