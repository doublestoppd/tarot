-- Operational/configuration tables only (spec §23).
-- Deliberately absent, by design and enforced by tests: users, profiles,
-- readings, natal charts, prompts, AI outputs. The encrypted reading ticket
-- exists specifically so that no reading persistence is ever needed.

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_code_hash TEXT,
  admin_secret_hash TEXT,
  session_epoch INTEGER NOT NULL DEFAULT 1,
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_provider TEXT NOT NULL DEFAULT 'openai',
  ai_model TEXT NOT NULL DEFAULT 'gpt-5.6-luna',
  daily_budget_microusd BIGINT NOT NULL DEFAULT 2000000,
  monthly_budget_microusd BIGINT NOT NULL DEFAULT 30000000,
  max_reading_cost_microusd BIGINT NOT NULL DEFAULT 50000,
  max_repair_cost_microusd BIGINT NOT NULL DEFAULT 50000,
  per_install_hourly_limit INTEGER NOT NULL DEFAULT 6,
  per_install_daily_limit INTEGER NOT NULL DEFAULT 20,
  global_ai_concurrency INTEGER NOT NULL DEFAULT 3,
  share_ttl_days INTEGER NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_daily (
  usage_date_utc DATE PRIMARY KEY,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  repair_requests INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_microusd BIGINT NOT NULL DEFAULT 0,
  provider_errors INTEGER NOT NULL DEFAULT 0,
  validation_failures INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  rate_key_hash TEXT NOT NULL,
  bucket_type TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (rate_key_hash, bucket_type, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets (expires_at);

CREATE TABLE IF NOT EXISTS budget_state (
  period_type TEXT NOT NULL,
  period_start_utc DATE NOT NULL,
  committed_microusd BIGINT NOT NULL DEFAULT 0,
  reserved_microusd BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (period_type, period_start_utc),
  CHECK (period_type IN ('daily', 'monthly')),
  CHECK (committed_microusd >= 0),
  CHECK (reserved_microusd >= 0)
);

CREATE TABLE IF NOT EXISTS budget_reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  reserved_microusd BIGINT NOT NULL,
  finalized_microusd BIGINT,
  status TEXT NOT NULL DEFAULT 'reserved',
  kind TEXT NOT NULL DEFAULT 'normal',
  ticket_nonce_hash TEXT NOT NULL,
  rate_key_hash TEXT,
  CHECK (status IN ('reserved', 'finalized', 'released', 'expired')),
  CHECK (kind IN ('normal', 'repair'))
);
-- One-call rule / idempotency barrier: a reading nonce can hold at most one
-- live-or-finalized normal reservation and one repair reservation, ever.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_nonce_kind
  ON budget_reservations (ticket_nonce_hash, kind)
  WHERE status IN ('reserved', 'finalized');
CREATE INDEX IF NOT EXISTS idx_reservation_active_expiry
  ON budget_reservations (expires_at)
  WHERE status = 'reserved';

CREATE TABLE IF NOT EXISTS share_artifacts (
  share_id TEXT PRIMARY KEY,
  ciphertext BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  algorithm TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_share_expiry ON share_artifacts (expires_at);
