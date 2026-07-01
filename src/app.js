import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { requireAuth, requireRoles } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';

import authRoutes from './modules/auth/auth.routes.js';
import venuesRoutes from './modules/venues/venues.routes.js';
import clientsRoutes from './modules/clients/clients.routes.js';
import leadsRoutes from './modules/leads/leads.routes.js';
import eventsRoutes from './modules/events/events.routes.js';
import offersRoutes from './modules/offers/offers.routes.js';
import contractsRoutes from './modules/contracts/contracts.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import paymentsWebhookRoutes from './modules/payments/payments.webhook.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import organizationRoutes from './modules/organization/organization.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import teamsRoutes from './modules/teams/teams.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: config.cors.origins }));
  app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max, standardHeaders: true, legacyHeaders: false }));
  app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, res, buffer) => {
        req.rawBody = buffer.toString('utf8');
      },
    }),
  );

  app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/documents', express.static(path.resolve(config.storageDir, 'documents')));

  app.use('/auth', authRoutes);
  app.use('/payments/webhook', paymentsWebhookRoutes);

  app.use(requireAuth);
  app.use('/venues', venuesRoutes);
  app.use('/clients', clientsRoutes);
  app.use('/leads', leadsRoutes);
  app.use('/events', eventsRoutes);
  app.use('/offers', offersRoutes);
  app.use('/contracts', contractsRoutes);
  app.use('/invoices', invoicesRoutes);
  app.use('/payments', paymentsRoutes);
  app.use('/dashboard', requireRoles('admin', 'manager'), dashboardRoutes);
  app.use('/organization', organizationRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/teams', teamsRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
