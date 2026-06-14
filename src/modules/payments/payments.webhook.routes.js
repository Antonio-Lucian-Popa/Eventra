import crypto from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { ApiError, asyncHandler } from '../../lib/http.js';
import { persistPaymentSuccess } from '../../utils/accounting.js';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    if (config.stripeService.webhookForwardSecret) {
      const expected = crypto.createHmac('sha256', config.stripeService.webhookForwardSecret).update(rawBody).digest('hex');
      if (req.get('x-service-signature') !== expected) {
        throw new ApiError(401, 'invalid_signature', 'Semnatura webhook invalida.');
      }
    }

    const metadata = req.body?.metadata || {};
    const paymentId = metadata.paymentId || req.body?.client_reference_id;
    if (!paymentId) return res.json({ received: true, ignored: true });

    if (['checkout.session.completed', 'payment_intent.succeeded'].includes(req.body.type)) {
      await persistPaymentSuccess(paymentId, req.body.payment_intent || req.body.event_id);
    } else if (['payment_intent.payment_failed', 'invoice.payment_failed'].includes(req.body.type)) {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: 'failed' } });
    }

    res.json({ received: true });
  }),
);

export default router;
