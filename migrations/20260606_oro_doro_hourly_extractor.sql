ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

UPDATE competitor_quote_sources
   SET name = 'Oro D''Oro',
       website_url = 'https://www.comproorodoro.it',
       source_type = 'oro_doro_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = CASE
         WHEN extraction_config IS NULL OR extraction_config = '{}'::jsonb THEN
           '{"method":"oro_doro_parser","url":"https://www.comproorodoro.it","currency":"EUR"}'::jsonb
         ELSE extraction_config || '{"method":"oro_doro_parser","url":"https://www.comproorodoro.it","currency":"EUR"}'::jsonb
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
 WHERE LOWER(name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro'));

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Oro D''Oro',
  'https://www.comproorodoro.it',
  'oro_doro_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"oro_doro_parser","url":"https://www.comproorodoro.it","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
    FROM competitor_quote_sources
   WHERE LOWER(name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro'))
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
      'https://www.comproorodoro.it',
      'oro_doro_gold_24kt',
      'ORO 24kt',
      'gold',
      '24kt',
      1.000000,
      'EUR/g',
      'ORO 24kt',
      'ORO\s*(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)[\s\S]{0,40}?24\s*(?:kt|k)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_gold_22kt',
      'ORO 22kt',
      'gold',
      '22kt',
      0.916667,
      'EUR/g',
      'ORO 22KT',
      'ORO\s*22\s*(?:kt|k)[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_gold_21kt',
      'ORO 21kt',
      'gold',
      '21kt',
      0.875000,
      'EUR/g',
      'ORO 21KT',
      'ORO\s*21\s*(?:kt|k)[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_gold_20kt',
      'ORO 20kt',
      'gold',
      '20kt',
      0.833333,
      'EUR/g',
      'ORO 20KT',
      'ORO\s*20\s*(?:kt|k)[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_gold_18kt',
      'ORO 18kt',
      'gold',
      '18kt',
      0.750000,
      'EUR/g',
      'ORO 18KT',
      'ORO\s*18\s*(?:kt|k)[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_gold_14kt',
      'ORO 14kt',
      'gold',
      '14kt',
      0.583333,
      'EUR/g',
      'ORO 14KT',
      'ORO\s*14\s*(?:kt|k)[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_gold_9kt',
      'ORO 9kt',
      'gold',
      '9kt',
      0.375000,
      'EUR/g',
      'ORO 9KT',
      'ORO\s*9\s*(?:kt|k)[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_silver_999',
      'ARGENTO 999',
      'silver',
      '999',
      0.999000,
      'EUR/g',
      'ARGENTO 999',
      'ARGENTO\s*(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)[\s\S]{0,40}?999'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_silver_925',
      'ARGENTO 925',
      'silver',
      '925',
      0.925000,
      'EUR/g',
      'ARGENTO 925',
      'ARGENTO\s*925[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    ),
    (
      'https://www.comproorodoro.it',
      'oro_doro_silver_800',
      'ARGENTO 800',
      'silver',
      '800',
      0.800000,
      'EUR/g',
      'ARGENTO 800',
      'ARGENTO\s*800[\s\S]{0,90}?(?:€\s*)?([0-9]+[,.]?[0-9]*)\s*(?:€\s*)?\/\s*(?:g|gr)'
    )
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro'))
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
