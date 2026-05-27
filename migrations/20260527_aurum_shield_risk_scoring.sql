ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_score INTEGER DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_risk_level TEXT DEFAULT 'basso';
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_summary TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS aurum_shield_scores (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT UNIQUE REFERENCES atti_vendita(id) ON DELETE SET NULL,
  client_id BIGINT NULL REFERENCES clienti(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL,
  summary TEXT,
  factors JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_shield_alerts (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NULL REFERENCES atti_vendita(id) ON DELETE SET NULL,
  client_id BIGINT NULL REFERENCES clienti(id) ON DELETE SET NULL,
  user_id BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  store_id BIGINT NULL REFERENCES negozi(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  reviewed_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_shield_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aurum_shield_scores_sale_deed_id ON aurum_shield_scores(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_scores_client_id ON aurum_shield_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_scores_risk_level ON aurum_shield_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_sale_deed_id ON aurum_shield_alerts(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_client_id ON aurum_shield_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_status ON aurum_shield_alerts(status);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_severity ON aurum_shield_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_created_at ON aurum_shield_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_settings_key ON aurum_shield_settings(key);

INSERT INTO aurum_shield_settings (key, value)
VALUES
  ('cash_limit_amount', '500'::jsonb),
  ('cash_window_days', '7'::jsonb),
  ('frequent_sales_limit', '3'::jsonb),
  ('document_expiry_warning_days', '30'::jsonb),
  ('block_critical_practices', 'false'::jsonb),
  ('dashboard_alerts_enabled', 'true'::jsonb),
  ('ai_explanation_enabled', 'false'::jsonb),
  ('factor_weights', '{
    "expired_document": 40,
    "document_expiring": 15,
    "duplicate_document": 35,
    "missing_fiscal_code": 25,
    "new_client": 5,
    "frequent_sales": 30,
    "multi_store_sales": 35,
    "cash_near_limit": 20,
    "cash_over_limit": 45,
    "iban_holder_mismatch": 20,
    "shared_iban": 30,
    "missing_precious_photos": 15,
    "missing_signature": 35,
    "missing_weight_or_title": 20,
    "anomalous_amount_weight": 20,
    "frequent_updates": 10,
    "negative_quality": 35,
    "missing_quality": 10,
    "missing_payment_receipt": 20,
    "previous_alerts": 25,
    "fast_completion": 15,
    "operator_anomalies": 15,
    "store_anomalies": 15
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
