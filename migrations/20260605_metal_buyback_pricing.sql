ALTER TABLE metal_price_history ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(18,6);

CREATE TABLE IF NOT EXISTS metal_price_predictions (
  id BIGSERIAL PRIMARY KEY,
  metal TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_metal_predictions_metal_created_at
  ON metal_price_predictions(metal, created_at DESC);

CREATE TABLE IF NOT EXISTS metal_buyback_policy_settings (
  id BIGSERIAL PRIMARY KEY,
  metal TEXT NOT NULL,
  purity_code TEXT NOT NULL,
  purity_value NUMERIC(10,6) NOT NULL,
  margin_target_pct NUMERIC(8,4) NOT NULL DEFAULT 0.15,
  refinery_spread_pct NUMERIC(8,4) DEFAULT 0.00,
  melting_loss_pct NUMERIC(8,4) DEFAULT 0.00,
  operating_cost_per_gram NUMERIC(18,6) DEFAULT 0,
  melting_cost_per_gram NUMERIC(18,6) DEFAULT 0,
  risk_buffer_pct NUMERIC(8,4) DEFAULT 0.00,
  negotiation_buffer_pct NUMERIC(8,4) DEFAULT 0.00,
  active BOOLEAN DEFAULT true,
  updated_by BIGINT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metal, purity_code)
);

CREATE TABLE IF NOT EXISTS metal_buyback_calculations (
  id BIGSERIAL PRIMARY KEY,
  metal TEXT NOT NULL,
  purity_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  spot_price_per_gram NUMERIC(18,6),
  theoretical_value_per_gram NUMERIC(18,6),
  recoverable_value_per_gram NUMERIC(18,6),
  max_payable_per_gram NUMERIC(18,6),
  recommended_payable_per_gram NUMERIC(18,6),
  margin_estimated_per_gram NUMERIC(18,6),
  margin_estimated_pct NUMERIC(8,4),
  scenario TEXT NOT NULL,
  prediction_horizon TEXT NOT NULL,
  inputs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyback_calculations_metal_created_at
  ON metal_buyback_calculations(metal, created_at DESC);
