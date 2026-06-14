import crypto from 'node:crypto';
import { stripe } from '../lib/stripe.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { isDuplicateEvent, recordEvent, markProcessed } from '../lib/db.js';

/** Verifies the Stripe signature and returns the parsed event (throws on failure). */
export function constructEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

/** Extracts the "app" tag we stored in metadata, if any. */
function resolveApp(event) {
  const obj = event.data?.object || {};
  return obj.metadata?.app || obj.subscription_details?.metadata?.app || null;
}

/**
 * Builds a compact, normalized summary so consuming apps don't have to know
 * Stripe's full object graph. The full event is included too, under `raw`.
 */
function summarize(event) {
  const obj = event.data?.object || {};
  const base = { event_id: event.id, type: event.type, created: event.created };

  switch (event.type) {
    case 'checkout.session.completed':
      return {
        ...base,
        mode: obj.mode, // 'payment' | 'subscription'
        payment_status: obj.payment_status,
        customer: obj.customer,
        customer_email: obj.customer_details?.email,
        amount_total: obj.amount_total,
        currency: obj.currency,
        subscription: obj.subscription || null,
        payment_intent: obj.payment_intent || null,
        client_reference_id: obj.client_reference_id || null,
        metadata: obj.metadata || {},
      };
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return {
        ...base,
        subscription: obj.id,
        customer: obj.customer,
        status: obj.status,
        cancel_at_period_end: obj.cancel_at_period_end,
        current_period_end: obj.current_period_end,
        price: obj.items?.data?.[0]?.price?.id,
        metadata: obj.metadata || {},
      };
    case 'invoice.paid':
    case 'invoice.payment_failed':
      return {
        ...base,
        invoice: obj.id,
        customer: obj.customer,
        subscription: obj.subscription || null,
        amount_paid: obj.amount_paid,
        amount_due: obj.amount_due,
        currency: obj.currency,
        hosted_invoice_url: obj.hosted_invoice_url,
        metadata: obj.metadata || {},
      };
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      return {
        ...base,
        payment_intent: obj.id,
        customer: obj.customer,
        amount: obj.amount,
        currency: obj.currency,
        status: obj.status,
        metadata: obj.metadata || {},
      };
    default:
      return { ...base, object_id: obj.id, metadata: obj.metadata || {} };
  }
}

/** Picks the forward URL for a given app (per-app config, then fallback). */
function forwardUrlFor(app) {
  if (app && config.webhooks.forwards[app]) return config.webhooks.forwards[app];
  return config.webhooks.fallbackUrl || null;
}

/** Forwards the signed event to the consuming application over HTTP. */
async function forward(url, payload) {
  const body = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json' };

  if (config.webhooks.forwardSecret) {
    const signature = crypto
      .createHmac('sha256', config.webhooks.forwardSecret)
      .update(body)
      .digest('hex');
    headers['x-service-signature'] = signature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
    return { status: res.status, ok: res.ok };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Full processing pipeline for a verified event:
 *  1) idempotency check  2) persist  3) forward to the app  4) mark processed
 */
export async function handleEvent(event) {
  if (await isDuplicateEvent(event.id)) {
    logger.info({ eventId: event.id, type: event.type }, 'Eveniment duplicat, ignorat.');
    return { duplicate: true };
  }

  const app = resolveApp(event);
  await recordEvent(event, app);

  const url = forwardUrlFor(app);
  const payload = { ...summarize(event), app, raw: event };

  let forwarded = false;
  let forwardStatus = null;
  let forwardError = null;

  if (url) {
    try {
      const result = await forward(url, payload);
      forwarded = result.ok;
      forwardStatus = result.status;
      if (!result.ok) forwardError = `HTTP ${result.status}`;
      logger.info({ eventId: event.id, app, url, status: result.status }, 'Eveniment trimis catre aplicatie.');
    } catch (err) {
      forwardError = err.message;
      logger.error({ err, eventId: event.id, app, url }, 'Trimiterea evenimentului a esuat.');
    }
  } else {
    logger.warn({ eventId: event.id, app }, 'Nicio tinta de forward configurata pentru acest eveniment.');
  }

  await markProcessed(event.id, { forwarded, forwardStatus, forwardError });
  return { duplicate: false, forwarded, app };
}
