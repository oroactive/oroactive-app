CREATE TABLE IF NOT EXISTS metal_price_history (
  id BIGSERIAL PRIMARY KEY,
  metal TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  price_per_ounce NUMERIC(18,6),
  price_per_gram NUMERIC(18,6),
  source TEXT,
  provider_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metal_price_history_metal_created_at
  ON metal_price_history(metal, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metal_price_history_source
  ON metal_price_history(source);

CREATE TABLE IF NOT EXISTS gold_price_predictions (
  id BIGSERIAL PRIMARY KEY,
  metal TEXT NOT NULL DEFAULT 'gold',
  currency TEXT NOT NULL DEFAULT 'EUR',
  prediction_horizon TEXT NOT NULL,
  current_price_per_gram NUMERIC(18,6),
  predicted_price_per_gram NUMERIC(18,6),
  predicted_low_per_gram NUMERIC(18,6),
  predicted_high_per_gram NUMERIC(18,6),
  trend TEXT,
  volatility TEXT,
  confidence TEXT,
  model_name TEXT,
  features JSONB DEFAULT '{}'::jsonb,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gold_predictions_created_at
  ON gold_price_predictions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_predictions_horizon
  ON gold_price_predictions(prediction_horizon);

CREATE TABLE IF NOT EXISTS gold_prediction_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by BIGINT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
