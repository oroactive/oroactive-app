ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

CREATE TABLE IF NOT EXISTS competitor_extraction_rules (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NULL REFERENCES competitor_quote_sources(id) ON DELETE SET NULL,
  competitor_name TEXT NOT NULL,
  page_url TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  metal TEXT NOT NULL,
  purity_code TEXT NOT NULL,
  purity_value NUMERIC(10,6),
  unit TEXT DEFAULT 'EUR/g',
  anchor_text TEXT,
  css_selector TEXT,
  xpath_selector TEXT,
  regex_pattern TEXT,
  extraction_method TEXT DEFAULT 'anchor_regex',
  required BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  last_test_status TEXT DEFAULT 'not_tested',
  last_test_value NUMERIC(18,6) NULL,
  last_test_evidence TEXT NULL,
  last_test_at TIMESTAMPTZ NULL,
  last_verified_by BIGINT NULL,
  last_verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, field_key)
);

UPDATE competitor_quote_sources
   SET website_url = 'https://www.comprooromilano.org',
       source_type = 'gruppo_oro_24k_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = COALESCE(extraction_config, '{}'::jsonb)
         || '{"method":"gruppo_oro_24k_parser","url":"https://www.comprooromilano.org","currency":"EUR"}'::jsonb,
       notes = CASE
         WHEN notes IS NULL OR notes = '' OR notes ILIKE '%Competitor preconfigurato OroActive%' THEN
           'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora'
         ELSE notes
       END,
       last_sync_status = CASE
         WHEN last_sync_status IS NULL OR last_sync_status IN ('', 'manual_required') THEN 'not_synced'
         ELSE last_sync_status
       END,
       next_sync_at = COALESCE(next_sync_at, NOW()),
       updated_at = NOW()
 WHERE LOWER(name) = LOWER('Gruppo Oro 24K');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Gruppo Oro 24K',
  'https://www.comprooromilano.org',
  'gruppo_oro_24k_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"gruppo_oro_24k_parser","url":"https://www.comprooromilano.org","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Gruppo Oro 24K')
);

INSERT INTO competitor_extraction_rules (
  source_id, competitor_name, page_url, field_key, label, metal, purity_code, purity_value,
  unit, anchor_text, regex_pattern, extraction_method, required, active, created_at, updated_at
)
SELECT
  source.id,
  source.name,
  rule.page_url,
  rule.field_key,
  rule.label,
  rule.metal,
  rule.purity_code,
  rule.purity_value,
  rule.unit,
  rule.anchor_text,
  rule.regex_pattern,
  'anchor_regex',
  true,
  true,
  NOW(),
  NOW()
FROM competitor_quote_sources source
CROSS JOIN (
  VALUES
    ('https://www.comprooromilano.org','gruppo_oro_24k_gold_24kt','ORO 24 Carati','gold','24kt',1.000000,'EUR/g','ORO 24 Carati','ORO\s*24\s*Carati[\s\S]{0,160}?([0-9]+[,.]?[0-9]*)\s*(?:€|eur|euro)?\s*\/?\s*(?:gr\.?|g|grammo|grammi)'),
    ('https://www.comprooromilano.org','gruppo_oro_24k_gold_18kt','ORO 18 Carati','gold','18kt',0.750000,'EUR/g','ORO 18 Carati','ORO\s*18\s*Carati[\s\S]{0,160}?([0-9]+[,.]?[0-9]*)\s*(?:€|eur|euro)?\s*\/?\s*(?:gr\.?|g|grammo|grammi)'),
    ('https://www.comprooromilano.org','gruppo_oro_24k_silver_999','Argento 999','silver','999',0.999000,'EUR/g','Argento 999','Argento\s*999[\s\S]{0,160}?([0-9]+[,.]?[0-9]*)\s*(?:€|eur|euro)?\s*\/?\s*(?:gr\.?|g|grammo|grammi)'),
    ('https://www.comprooromilano.org','gruppo_oro_24k_silver_800','Argento 800','silver','800',0.800000,'EUR/g','Argento 800','Argento\s*800[\s\S]{0,160}?([0-9]+[,.]?[0-9]*)\s*(?:€|eur|euro)?\s*\/?\s*(?:gr\.?|g|grammo|grammi)')
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Gruppo Oro 24K')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
