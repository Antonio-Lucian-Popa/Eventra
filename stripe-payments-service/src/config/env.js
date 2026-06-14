import 'dotenv/config';
import { z } from 'zod';

/**
 * Parses a string like "app1:key1,app2:key2" OR "key1,key2" into a map.
 * - With "name:value" pairs -> { name: value }
 * - With plain values       -> { value: value } (name == value)
 */
function parsePairs(raw) {
  const map = {};
  if (!raw) return map;
  for (const chunk of raw.split(',')) {
    const part = chunk.trim();
    if (!part) continue;
    const idx = part.indexOf(':');
    if (idx === -1) {
      map[part] = part;
    } else {
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (name && value) map[name] = value;
    }
  }
  return map;
}

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),

  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY este obligatoriu'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET este obligatoriu'),
  STRIPE_API_VERSION: z.string().optional(),

  // "app1:key1,app2:key2" sau "key1,key2"
  API_KEYS: z.string().min(1, 'API_KEYS este obligatoriu (cel putin o cheie)'),

  // "app1:https://app1.com/stripe,app2:https://app2.com/stripe"
  WEBHOOK_FORWARDS: z.string().optional(),
  // o singura tinta fallback daca evenimentul nu are app in metadata
  WEBHOOK_FORWARD_URL: z.string().url().optional(),
  // secret HMAC cu care semnam payload-ul trimis catre aplicatiile tale
  WEBHOOK_FORWARD_SECRET: z.string().optional(),

  // Postgres este OPTIONAL. Fara el, serviciul ruleaza stateless (idempotency in-memory).
  DATABASE_URL: z.string().optional(),

  DEFAULT_CURRENCY: z.string().default('ron'),
  DEFAULT_SUCCESS_URL: z.string().url().optional(),
  DEFAULT_CANCEL_URL: z.string().url().optional(),

  // CORS: "*" sau lista "https://a.com,https://b.com"
  CORS_ORIGINS: z.string().default('*'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Configurare invalida:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const raw = parsed.data;

const apiKeys = parsePairs(raw.API_KEYS); // { appName: key }
const keyToApp = {};
for (const [app, key] of Object.entries(apiKeys)) keyToApp[key] = app;

const webhookForwards = parsePairs(raw.WEBHOOK_FORWARDS); // { appName: url }

export const config = {
  env: raw.NODE_ENV,
  isProd: raw.NODE_ENV === 'production',
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL,

  stripe: {
    secretKey: raw.STRIPE_SECRET_KEY,
    webhookSecret: raw.STRIPE_WEBHOOK_SECRET,
    apiVersion: raw.STRIPE_API_VERSION || undefined,
  },

  auth: {
    keyToApp, // { key: appName }
    appToKey: apiKeys, // { appName: key }
  },

  webhooks: {
    forwards: webhookForwards, // { appName: url }
    fallbackUrl: raw.WEBHOOK_FORWARD_URL,
    forwardSecret: raw.WEBHOOK_FORWARD_SECRET,
  },

  database: {
    url: raw.DATABASE_URL,
    enabled: Boolean(raw.DATABASE_URL),
  },

  defaults: {
    currency: raw.DEFAULT_CURRENCY.toLowerCase(),
    successUrl: raw.DEFAULT_SUCCESS_URL,
    cancelUrl: raw.DEFAULT_CANCEL_URL,
  },

  cors: {
    origins: raw.CORS_ORIGINS === '*' ? '*' : raw.CORS_ORIGINS.split(',').map((s) => s.trim()),
  },
};
