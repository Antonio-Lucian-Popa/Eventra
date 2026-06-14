import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createPortalSession } from '../services/subscription.service.js';

const router = Router();

// POST /v1/portal/session   body: { customerId, returnUrl }
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const { customerId, returnUrl } = req.body || {};
    res.status(201).json(await createPortalSession({ customerId, returnUrl }));
  }),
);

export default router;
