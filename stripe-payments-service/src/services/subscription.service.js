import { stripe } from '../lib/stripe.js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function getSubscription(id) {
  return stripe.subscriptions.retrieve(id, { expand: ['items.data.price.product', 'customer'] });
}

/**
 * Cancels a subscription. By default at period end (recommended), or
 * immediately if { immediately: true }.
 */
export async function cancelSubscription(id, { immediately = false } = {}) {
  if (immediately) {
    return stripe.subscriptions.cancel(id);
  }
  return stripe.subscriptions.update(id, { cancel_at_period_end: true });
}

/** Undoes a scheduled cancellation. */
export async function resumeSubscription(id) {
  return stripe.subscriptions.update(id, { cancel_at_period_end: false });
}

/**
 * Swaps the plan of an existing subscription to a new price.
 * Uses proration by default.
 */
export async function changeSubscriptionPrice(id, newPriceId, { prorationBehavior = 'create_prorations' } = {}) {
  if (!newPriceId) throw new ApiError(400, 'invalid_request', 'newPriceId este obligatoriu.');
  const sub = await stripe.subscriptions.retrieve(id);
  const currentItem = sub.items.data[0];
  return stripe.subscriptions.update(id, {
    items: [{ id: currentItem.id, price: newPriceId }],
    proration_behavior: prorationBehavior,
  });
}

/**
 * Creates a Stripe Billing Portal session so the customer can self-manage
 * payment methods, invoices, plan changes and cancellations.
 */
export async function createPortalSession({ customerId, returnUrl }) {
  if (!customerId) throw new ApiError(400, 'invalid_request', 'customerId este obligatoriu.');
  const url = returnUrl || config.defaults.successUrl;
  if (!url) throw new ApiError(400, 'invalid_request', 'returnUrl este obligatoriu.');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: url,
  });
  return { url: session.url };
}
