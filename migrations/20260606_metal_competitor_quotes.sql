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
  notes TEXT,
  selectors JSONB DEFAULT '{}'::jsonb,
  created_by BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_competitor_quotes_date
  ON competitor_buyback_quotes(quote_date DESC);
