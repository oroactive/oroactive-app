ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

UPDATE competitor_quote_sources
   SET website_url = 'https://www.orometallipreziosi.com',
       source_type = 'bordin_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = CASE
         WHEN extraction_config IS NULL OR extraction_config = '{}'::jsonb THEN
           '{"method":"bordin_parser","url":"https://www.orometallipreziosi.com","currency":"EUR","min_quantity_grams":35}'::jsonb
         ELSE extraction_config || '{"method":"bordin_parser","url":"https://www.orometallipreziosi.com","currency":"EUR","min_quantity_grams":35}'::jsonb
       END,
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
 WHERE LOWER(name) = LOWER('Bordin');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Bordin',
  'https://www.orometallipreziosi.com',
  'bordin_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"bordin_parser","url":"https://www.orometallipreziosi.com","currency":"EUR","min_quantity_grams":35}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Bordin')
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
    (
      'https://www.orometallipreziosi.com',
      'bordin_gold_24kt',
      'Oro 24kt - 999,9‰',
      'gold',
      '24kt',
      0.999900,
      'EUR/g',
      'Oro 24kt',
      'Oro\s*24\s*(?:kt|k)[\s\S]{0,120}?999[,.]9\s*(?:‰|per\s*mille|\/\s*1000)[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'
    ),
    (
      'https://www.orometallipreziosi.com',
      'bordin_gold_18kt',
      'Oro 18kt - 750‰',
      'gold',
      '18kt',
      0.750000,
      'EUR/g',
      'Oro 18kt',
      'Oro\s*18\s*(?:kt|k)[\s\S]{0,120}?750\s*(?:‰|per\s*mille|\/\s*1000)[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'
    ),
    (
      'https://www.orometallipreziosi.com',
      'bordin_gold_14kt',
      'Oro 14kt - 585‰',
      'gold',
      '14kt',
      0.585000,
      'EUR/g',
      'Oro 14kt',
      'Oro\s*14\s*(?:kt|k)[\s\S]{0,120}?585\s*(?:‰|per\s*mille|\/\s*1000)[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'
    )
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Bordin')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
