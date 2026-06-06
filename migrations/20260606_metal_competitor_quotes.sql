ALTER TABLE metal_price_history ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(18,6);
ALTER TABLE metal_price_history ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE metal_price_history ALTER COLUMN source SET DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_metal_price_history_metal_currency
  ON metal_price_history(metal, currency);

CREATE INDEX IF NOT EXISTS idx_metal_price_history_source
  ON metal_price_history(source);

CREATE TABLE IF NOT EXISTS competitor_quote_sources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  active BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 180,
  notes TEXT,
  selectors JSONB DEFAULT '{}'::jsonb,
  extraction_config JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ NULL,
  next_sync_at TIMESTAMPTZ NULL,
  last_sync_status TEXT DEFAULT 'not_synced',
  last_sync_error TEXT NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ NULL;
ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS last_sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT true;
ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 180;
ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMPTZ NULL;
ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS last_sync_error TEXT NULL;
ALTER TABLE competitor_quote_sources ADD COLUMN IF NOT EXISTS extraction_config JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS competitor_buyback_quotes (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NULL REFERENCES competitor_quote_sources(id) ON DELETE SET NULL,
  competitor_name TEXT NOT NULL,
  metal TEXT NOT NULL,
  purity_code TEXT NOT NULL,
  purity_value NUMERIC(10,6) NOT NULL,
  price_per_gram NUMERIC(18,6),
  price_per_kg NUMERIC(18,6),
  currency TEXT DEFAULT 'EUR',
  quote_date TIMESTAMPTZ DEFAULT NOW(),
  extraction_method TEXT DEFAULT 'manual',
  confidence TEXT DEFAULT 'medium',
  url TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_quotes_metal_purity
  ON competitor_buyback_quotes(metal, purity_code);

CREATE INDEX IF NOT EXISTS idx_competitor_quotes_competitor
  ON competitor_buyback_quotes(competitor_name);

CREATE INDEX IF NOT EXISTS idx_competitor_quotes_date
  ON competitor_buyback_quotes(quote_date DESC);

CREATE TABLE IF NOT EXISTS competitor_quote_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NULL REFERENCES competitor_quote_sources(id) ON DELETE SET NULL,
  competitor_name TEXT,
  status TEXT NOT NULL,
  quotes_found INTEGER DEFAULT 0,
  quotes_saved INTEGER DEFAULT 0,
  error_message TEXT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_competitor_sync_logs_source_id
  ON competitor_quote_sync_logs(source_id);

CREATE INDEX IF NOT EXISTS idx_competitor_sync_logs_started_at
  ON competitor_quote_sync_logs(started_at DESC);
