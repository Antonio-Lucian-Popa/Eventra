-- Schema este creata automat la pornire de catre src/lib/db.js.
-- Acest fisier este pastrat doar ca referinta / pentru rulare manuala.
CREATE TABLE IF NOT EXISTS stripe_events (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  app            TEXT,
  payload        JSONB NOT NULL,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at   TIMESTAMPTZ,
  forwarded      BOOLEAN NOT NULL DEFAULT false,
  forward_status INTEGER,
  forward_error  TEXT
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events (type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_app  ON stripe_events (app);
