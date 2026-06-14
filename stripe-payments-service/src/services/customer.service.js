import { stripe } from '../lib/stripe.js';

/**
 * Finds an existing customer by email (within the app namespace) or creates one.
 * We tag every customer with metadata.app so webhooks can be routed back.
 */
export async function findOrCreateCustomer({ app, email, name, phone, externalId, metadata = {} }) {
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 100 });
    const match = existing.data.find((c) => (c.metadata?.app || null) === (app || null));
    if (match) return match;
  }

  return stripe.customers.create({
    email,
    name,
    phone,
    metadata: { ...metadata, app: app || '', external_id: externalId || '' },
  });
}

export async function getCustomer(id) {
  return stripe.customers.retrieve(id);
}

export async function listCustomerSubscriptions(customerId) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
    expand: ['data.items.data.price.product'],
  });
  return subs.data;
}
