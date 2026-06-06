UPDATE competitor_quote_sources
   SET website_url = 'https://www.amico-oro.it',
       source_type = 'amico_oro_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = CASE
         WHEN extraction_config IS NULL OR extraction_config = '{}'::jsonb THEN
           '{"method":"amico_oro_parser","url":"https://www.amico-oro.it","currency":"EUR"}'::jsonb
         ELSE extraction_config || '{"method":"amico_oro_parser","url":"https://www.amico-oro.it","currency":"EUR"}'::jsonb
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
 WHERE LOWER(name) = LOWER('Amico Oro');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Amico Oro',
  'https://www.amico-oro.it',
  'amico_oro_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"amico_oro_parser","url":"https://www.amico-oro.it","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Amico Oro')
);

INSERT INTO competitor_extraction_rules (
  source_id, competitor_name, page_url, field_key, label, metal, purity_code, purity_value,
  unit, anchor_text, regex_pattern, extraction_method, required, active, created_at, updated_at
)
SELECT
  source.id,
  source.name,
  source.website_url,
  rule.field_key,
  rule.label,
  rule.metal,
  rule.purity_code,
  rule.purity_value,
  'EUR/g',
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
    ('amico_oro_gold_24kt', '24K al gr', 'gold', '24kt', 1.000000, '24K al gr', '24K\s*al\s*gr\s*=\s*([0-9]+[,.]?[0-9]*)\s*€'),
    ('amico_oro_gold_18kt', '18K al gr', 'gold', '18kt', 0.750000, '18K al gr', '18K\s*al\s*gr\s*=\s*([0-9]+[,.]?[0-9]*)\s*€'),
    ('amico_oro_gold_14kt', '14K al gr', 'gold', '14kt', 0.583333, '14K al gr', '14K\s*al\s*gr\s*=\s*([0-9]+[,.]?[0-9]*)\s*€')
) AS rule(field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Amico Oro')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
