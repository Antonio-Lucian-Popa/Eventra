import pg from 'pg';
import { config } from '../config/env.js';
import { logger } from './logger.js';

const { Pool } = pg;

let pool = null;
const memoryEvents = new Set(); // fallback idempotency cache (non-durable)

export function isDbEnabled() {
  return config.database.enabled;
}

export async function initDb() {
  if (!config.database.enabled) {
    logger.warn('DATABASE_URL nu este setat -> rulez stateless (idempotency in-memory).');
    return;
  }

  pool = new Pool({ connectionString: config.database.url, max: 10 });
  pool.on('error', (err) => logger.error({ err }, 'Eroare neasteptata pe pool-ul Postgres'));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id            TEXT PRIMARY KEY,
      type          TEXT NOT NULL,
      app           TEXT,
      payload       JSONB NOT NULL,
      received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      processed_at  TIMESTAMPTZ,
      forwarded     BOOLEAN NOT NULL DEFAULT false,
      forward_status INTEGER,
      forward_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events (type);
    CREATE INDEX IF NOT EXISTS idx_stripe_events_app  ON stripe_events (app);
  `);

  logger.info('Postgres conectat si schema initializata.');
}

export async function query(text, params) {
  if (!pool) throw new Error('Baza de date nu este activata.');
  return pool.query(text, params);
}

/**
 * Returns true if the event was already seen (idempotency).
 * Records it otherwise.
 */
export async function isDuplicateEvent(eventId) {
  if (!pool) {
    if (memoryEvents.has(eventId)) return true;
    memoryEvents.add(eventId);
    // keep the set from growing unbounded
    if (memoryEvents.size > 5000) memoryEvents.clear();
    return false;
  }
  const res = await pool.query('SELECT 1 FROM stripe_events WHERE id = $1', [eventId]);
  return res.rowCount > 0;
}

export async function recordEvent(event, app) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO stripe_events (id, type, app, payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [event.id, event.type, app || null, event],
  );
}

export async function markProcessed(eventId, { forwarded, forwardStatus, forwardError } = {}) {
  if (!pool) return;
  await pool.query(
    `UPDATE stripe_events
       SET processed_at = now(),
           forwarded = $2,
           forward_status = $3,
           forward_error = $4
     WHERE id = $1`,
    [eventId, Boolean(forwarded), forwardStatus ?? null, forwardError ?? null],
  );
}

export async function closeDb() {
  if (pool) await pool.end();
}
