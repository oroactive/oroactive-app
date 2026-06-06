ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_competitor_quotes_ai_valid
  ON competitor_buyback_quotes(ai_extracted, quote_type, ai_confidence);

CREATE TABLE IF NOT EXISTS competitor_ai_extraction_runs (
  id BIGSERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  sources_total INTEGER DEFAULT 0,
  sources_success INTEGER DEFAULT 0,
  sources_failed INTEGER DEFAULT 0,
  pages_analyzed INTEGER DEFAULT 0,
  quotes_extracted INTEGER DEFAULT 0,
  quotes_saved INTEGER DEFAULT 0,
  error_message TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS competitor_ai_extraction_page_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NULL REFERENCES competitor_ai_extraction_runs(id) ON DELETE SET NULL,
  source_id BIGINT NULL REFERENCES competitor_quote_sources(id) ON DELETE SET NULL,
  competitor_name TEXT,
  page_url TEXT NOT NULL,
  status TEXT NOT NULL,
  quotes_found INTEGER DEFAULT 0,
  error_message TEXT NULL,
  ai_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_ai_runs_started_at
  ON competitor_ai_extraction_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_ai_page_logs_run_id
  ON competitor_ai_extraction_page_logs(run_id);

CREATE INDEX IF NOT EXISTS idx_competitor_ai_page_logs_source_id
  ON competitor_ai_extraction_page_logs(source_id);
