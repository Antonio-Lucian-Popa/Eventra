import { Router } from 'express';
import express from 'express';
import { logger } from '../lib/logger.js';
import { constructEvent, handleEvent } from '../services/webhook.service.js';

const router = Router();

/**
 * POST /webhooks/stripe
 * NOTE: this route MUST receive the raw body (not JSON-parsed) so the Stripe
 * signature can be verified. We mount express.raw() locally for this reason.
 * No API key here — authenticity is proven by the Stripe signature.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.get('stripe-signature');
    let event;

    try {
      event = constructEvent(req.body, signature);
    } catch (err) {
      logger.warn({ err: err.message }, 'Verificarea semnaturii webhook a esuat.');
      return res.status(400).json({ error: { code: 'invalid_signature', message: err.message } });
    }

    // Acknowledge Stripe immediately, then process. Stripe retries on non-2xx,
    // and our idempotency layer makes retries safe.
    res.status(200).json({ received: true });

    handleEvent(event).catch((err) =>
      logger.error({ err, eventId: event.id }, 'Procesarea evenimentului a esuat.'),
    );
  },
);

export default router;
