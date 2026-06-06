ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

UPDATE competitor_quote_sources
   SET website_url = 'https://www.quotazioneritirooro.it',
       source_type = 'oro_in_euro_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = COALESCE(extraction_config, '{}'::jsonb)
         || '{"method":"oro_in_euro_parser","url":"https://www.quotazioneritirooro.it","currency":"EUR"}'::jsonb,
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
 WHERE LOWER(name) = LOWER('Oro in Euro');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Oro in Euro',
  'https://www.quotazioneritirooro.it',
  'oro_in_euro_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"oro_in_euro_parser","url":"https://www.quotazioneritirooro.it","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Oro in Euro')
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
    ('https://www.quotazioneritirooro.it','oro_in_euro_gold_18kt','Oro 750/1000','gold','18kt',0.750000,'EUR/g','Oro 750/1000','Oro\s*750\s*\/\s*1000[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/?\s*(?:Grammo|grammo|g|gr)'),
    ('https://www.quotazioneritirooro.it','oro_in_euro_gold_24kt','Oro 999/1000','gold','24kt',0.999000,'EUR/g','Oro 999/1000','Oro\s*999\s*\/\s*1000[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/?\s*(?:Grammo|grammo|g|gr)'),
    ('https://www.quotazioneritirooro.it','oro_in_euro_silver_999','Argento 999/1000','silver','999',0.999000,'EUR/g','Argento 999/1000','Argento\s*999\s*\/\s*1000[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/?\s*(?:Grammo|grammo|g|gr)')
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Oro in Euro')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
