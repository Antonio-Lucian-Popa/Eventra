import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  changeSubscriptionPrice,
} from '../services/subscription.service.js';

const router = Router();

// GET /v1/subscriptions/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getSubscription(req.params.id));
  }),
);

// POST /v1/subscriptions/:id/cancel   body: { immediately?: boolean }
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    res.json(await cancelSubscription(req.params.id, { immediately: Boolean(req.body?.immediately) }));
  }),
);

// POST /v1/subscriptions/:id/resume
router.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    res.json(await resumeSubscription(req.params.id));
  }),
);

// POST /v1/subscriptions/:id/change   body: { newPriceId, prorationBehavior? }
router.post(
  '/:id/change',
  asyncHandler(async (req, res) => {
    const { newPriceId, prorationBehavior } = req.body || {};
    res.json(await changeSubscriptionPrice(req.params.id, newPriceId, { prorationBehavior }));
  }),
);

export default router;
