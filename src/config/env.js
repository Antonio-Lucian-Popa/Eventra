import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().startsWith('postgresql://', 'DATABASE_URL trebuie sa fie PostgreSQL.'),
  JWT_SECRET: z.string().min(24, 'JWT_SECRET trebuie sa aiba minimum 24 caractere.'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_MINUTES: z.coerce.number().int().positive().default(30),
  INVITATION_DAYS: z.coerce.number().int().positive().default(7),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  CORS_ORIGINS: z.string().default('*'),
  STORAGE_DIR: z.string().default('storage'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  STRIPE_PAYMENTS_SERVICE_URL: z.string().url().optional(),
  STRIPE_PAYMENTS_SERVICE_API_KEY: z.string().optional(),
  STRIPE_WEBHOOK_FORWARD_SECRET: z.string().optional(),
  PAYMENTS_SUCCESS_URL: z.string().url().optional(),
  PAYMENTS_CANCEL_URL: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configurare invalida:');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshTokenDays: env.REFRESH_TOKEN_DAYS,
    passwordResetMinutes: env.PASSWORD_RESET_MINUTES,
    invitationDays: env.INVITATION_DAYS,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  storageDir: env.STORAGE_DIR,
  appUrl: env.APP_URL,
  smtp: {
    enabled: Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM),
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },
  cors: {
    origins: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  },
  stripeService: {
    url: env.STRIPE_PAYMENTS_SERVICE_URL,
    apiKey: env.STRIPE_PAYMENTS_SERVICE_API_KEY,
    webhookForwardSecret: env.STRIPE_WEBHOOK_FORWARD_SECRET,
    successUrl: env.PAYMENTS_SUCCESS_URL,
    cancelUrl: env.PAYMENTS_CANCEL_URL,
  },
};
