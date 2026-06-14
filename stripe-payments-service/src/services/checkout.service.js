import { stripe } from '../lib/stripe.js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Normalizes incoming line items into Stripe's expected format.
 * Accepts two styles:
 *  1) Existing prices:  [{ price: "price_123", quantity: 2 }]
 *  2) Ad-hoc prices:    [{ name: "Tricou", amount: 5000, currency: "ron", quantity: 1 }]
 *     (amount is in the smallest currency unit, e.g. bani / cents)
 */
function buildLineItems(items, { mode, currency }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'invalid_request', 'Campul "items" trebuie sa fie un array ne-gol.');
  }

  return items.map((item) => {
    const quantity = item.quantity ?? 1;

    if (item.price) {
      return { price: item.price, quantity };
    }

    if (item.amount == null || !item.name) {
      throw new ApiError(
        400,
        'invalid_request',
        'Fiecare item are nevoie fie de "price", fie de "name" + "amount".',
      );
    }

    const priceData = {
      currency: (item.currency || currency || config.defaults.currency).toLowerCase(),
      product_data: { name: item.name, ...(item.description ? { description: item.description } : {}) },
      unit_amount: item.amount,
    };

    if (mode === 'subscription') {
      priceData.recurring = {
        interval: item.interval || 'month',
        interval_count: item.interval_count || 1,
      };
    }

    return { price_data: priceData, quantity };
  });
}

/**
 * Creates a Stripe Checkout Session (hosted page) for either one-time
 * payments (mode: 'payment') or subscriptions (mode: 'subscription').
 */
export async function createCheckoutSession({
  app,
  mode = 'payment',
  items,
  customerId,
  customerEmail,
  successUrl,
  cancelUrl,
  currency,
  metadata = {},
  allowPromotionCodes = true,
  trialPeriodDays,
  clientReferenceId,
  locale,
}) {
  if (!['payment', 'subscription'].includes(mode)) {
    throw new ApiError(400, 'invalid_request', 'mode trebuie sa fie "payment" sau "subscription".');
  }

  const success = successUrl || config.defaults.successUrl;
  const cancel = cancelUrl || config.defaults.cancelUrl;
  if (!success || !cancel) {
    throw new ApiError(
      400,
      'invalid_request',
      'successUrl si cancelUrl sunt obligatorii (sau seteaza DEFAULT_SUCCESS_URL / DEFAULT_CANCEL_URL).',
    );
  }

  const line_items = buildLineItems(items, { mode, currency });
  const mergedMetadata = { ...metadata, app: app || '' };

  const params = {
    mode,
    line_items,
    success_url: success,
    cancel_url: cancel,
    metadata: mergedMetadata,
    allow_promotion_codes: allowPromotionCodes,
    ...(clientReferenceId ? { client_reference_id: clientReferenceId } : {}),
    ...(locale ? { locale } : {}),
  };

  if (customerId) {
    params.customer = customerId;
  } else if (customerEmail) {
    params.customer_email = customerEmail;
  }

  if (mode === 'subscription') {
    params.subscription_data = {
      metadata: mergedMetadata,
      ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
    };
  } else {
    // attach metadata to the resulting PaymentIntent too
    params.payment_intent_data = { metadata: mergedMetadata };
  }

  const session = await stripe.checkout.sessions.create(params);
  return { id: session.id, url: session.url };
}

/**
 * Creates a PaymentIntent for custom (non-hosted) one-time payment UIs.
 * Returns the client_secret to confirm on the frontend with Stripe.js.
 */
export async function createPaymentIntent({
  app,
  amount,
  currency,
  customerId,
  metadata = {},
  description,
  automaticPaymentMethods = true,
}) {
  if (amount == null || amount <= 0) {
    throw new ApiError(400, 'invalid_request', 'amount (in subunitati, ex. bani) este obligatoriu.');
  }

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: (currency || config.defaults.currency).toLowerCase(),
    ...(customerId ? { customer: customerId } : {}),
    ...(description ? { description } : {}),
    metadata: { ...metadata, app: app || '' },
    automatic_payment_methods: { enabled: Boolean(automaticPaymentMethods) },
  });

  return {
    id: intent.id,
    client_secret: intent.client_secret,
    amount: intent.amount,
    currency: intent.currency,
    status: intent.status,
  };
}
