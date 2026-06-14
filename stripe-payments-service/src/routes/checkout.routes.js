import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createCheckoutSession, createPaymentIntent } from '../services/checkout.service.js';

const router = Router();

// POST /v1/checkout/session  (one-time OR subscription, hosted Stripe page)
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const result = await createCheckoutSession({ app: req.app_name, ...req.body });
    res.status(201).json(result);
  }),
);

// POST /v1/checkout/payment-intent  (custom UI, one-time)
router.post(
  '/payment-intent',
  asyncHandler(async (req, res) => {
    const result = await createPaymentIntent({ app: req.app_name, ...req.body });
    res.status(201).json(result);
  }),
);

export default router;
