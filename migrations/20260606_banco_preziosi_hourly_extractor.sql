ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

UPDATE competitor_quote_sources
   SET website_url = 'https://www.bancopreziosimilano.it',
       source_type = 'banco_preziosi_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = CASE
         WHEN extraction_config IS NULL OR extraction_config = '{}'::jsonb THEN
           '{"method":"banco_preziosi_parser","url":"https://www.bancopreziosimilano.it","quote_url":"https://www.bancopreziosimilano.it/quotazioni","currency":"EUR"}'::jsonb
         ELSE extraction_config || '{"method":"banco_preziosi_parser","url":"https://www.bancopreziosimilano.it","quote_url":"https://www.bancopreziosimilano.it/quotazioni","currency":"EUR"}'::jsonb
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
 WHERE LOWER(name) = LOWER('Banco Preziosi');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Banco Preziosi',
  'https://www.bancopreziosimilano.it',
  'banco_preziosi_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"banco_preziosi_parser","url":"https://www.bancopreziosimilano.it","quote_url":"https://www.bancopreziosimilano.it/quotazioni","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Banco Preziosi')
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
      'https://www.bancopreziosimilano.it/quotazioni',
      'banco_preziosi_gold_24kt_reference',
      'Quotazione ufficiale oro',
      'gold',
      '24kt',
      1.000000,
      'EUR/g',
      'QUOTAZIONE UFFICIALE ORO',
      'QUOTAZIONE\s+UFFICIALE\s+ORO[\s\S]{0,120}?euro\s*([0-9]+[,.]?[0-9]*)\s*al\s*grammo'
    ),
    (
      'https://www.bancopreziosimilano.it/quotazioni',
      'banco_preziosi_gold_18kt',
      'Acquistiamo oro 18K',
      'gold',
      '18kt',
      0.750000,
      'EUR/g',
      'ACQUISTIAMO ORO 18K',
      '(?:ACQUISTIAMO\s+)?ORO\s*18\s*(?:K|kt)[\s\S]{0,120}?(?:euro|€)\s*([0-9]+[,.]?[0-9]*)\s*al\s*grammo'
    ),
    (
      'https://www.bancopreziosimilano.it/quotazioni',
      'banco_preziosi_silver_925',
      'Argento 925',
      'silver',
      '925',
      0.925000,
      'EUR/kg',
      'ARGENTO 925',
      'ARGENTO\s*925[\s\S]{0,80}?€\s*([0-9]+[,.]?[0-9]*)\s*al\s*KG'
    ),
    (
      'https://www.bancopreziosimilano.it/quotazioni',
      'banco_preziosi_silver_800',
      'Argento 800',
      'silver',
      '800',
      0.800000,
      'EUR/kg',
      'ARGENTO 800',
      'ARGENTO\s*800[\s\S]{0,80}?€\s*([0-9]+[,.]?[0-9]*)\s*al\s*Kg'
    )
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Banco Preziosi')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
