import { stripe } from '../lib/stripe.js';

/**
 * Lists active products with their active prices, in a flat, easy-to-consume shape.
 */
export async function listProducts({ limit = 100 } = {}) {
  const products = await stripe.products.list({ active: true, limit });
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });

  const pricesByProduct = {};
  for (const price of prices.data) {
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    (pricesByProduct[productId] ||= []).push({
      id: price.id,
      currency: price.currency,
      unit_amount: price.unit_amount,
      type: price.type, // 'one_time' | 'recurring'
      recurring: price.recurring
        ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
        : null,
      nickname: price.nickname,
    });
  }

  return products.data.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    images: p.images,
    metadata: p.metadata,
    prices: pricesByProduct[p.id] || [],
  }));
}
