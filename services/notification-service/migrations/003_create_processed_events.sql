CREATE TABLE IF NOT EXISTS processed_events (
    idempotency_key UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);