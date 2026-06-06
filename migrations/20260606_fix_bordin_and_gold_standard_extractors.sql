ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;

UPDATE competitor_quote_sources
   SET website_url = 'https://oroemetallipreziosi.com',
       source_type = 'bordin_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = COALESCE(extraction_config, '{}'::jsonb)
         || '{"method":"bordin_parser","url":"https://oroemetallipreziosi.com","currency":"EUR","min_quantity_grams":35,"silver_min_quantity_grams":1000}'::jsonb,
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
  'https://oroemetallipreziosi.com',
  'bordin_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"bordin_parser","url":"https://oroemetallipreziosi.com","currency":"EUR","min_quantity_grams":35,"silver_min_quantity_grams":1000}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Bordin')
);

UPDATE competitor_extraction_rules
   SET page_url = 'https://oroemetallipreziosi.com',
       updated_at = NOW()
 WHERE LOWER(competitor_name) = LOWER('Bordin')
   AND page_url ILIKE '%orometallipreziosi.com%';

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
    ('https://oroemetallipreziosi.com','bordin_gold_24kt','Oro 24kt - 999,9‰','gold','24kt',0.999900,'EUR/g','Oro 24kt','Oro\s*24\s*(?:kt|k)[\s\S]{0,120}?999[,.]9\s*(?:‰|per\s*mille|\/\s*1000)[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'),
    ('https://oroemetallipreziosi.com','bordin_gold_18kt','Oro 18kt - 750‰','gold','18kt',0.750000,'EUR/g','Oro 18kt','Oro\s*18\s*(?:kt|k)[\s\S]{0,120}?750\s*(?:‰|per\s*mille|\/\s*1000)[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'),
    ('https://oroemetallipreziosi.com','bordin_gold_14kt','Oro 14kt - 585‰','gold','14kt',0.585000,'EUR/g','Oro 14kt','Oro\s*14\s*(?:kt|k)[\s\S]{0,120}?585\s*(?:‰|per\s*mille|\/\s*1000)[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'),
    ('https://oroemetallipreziosi.com','bordin_silver_999','Argento 999‰','silver','999',0.999000,'EUR/g','Argento 999','Argento\s*999\s*(?:‰|per\s*mille|\/\s*1000)?[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'),
    ('https://oroemetallipreziosi.com','bordin_silver_925','Argento 925‰','silver','925',0.925000,'EUR/g','Argento 925','Argento\s*925\s*(?:‰|per\s*mille|\/\s*1000)?[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)'),
    ('https://oroemetallipreziosi.com','bordin_silver_800','Argento 800‰','silver','800',0.800000,'EUR/g','Argento 800','Argento\s*800\s*(?:‰|per\s*mille|\/\s*1000)?[\s\S]{0,120}?([0-9]+[,.]?[0-9]*)\s*€\s*\/\s*(?:gr|g)')
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Bordin')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );

UPDATE competitor_quote_sources
   SET website_url = 'https://www.goldstandard.gold',
       source_type = 'gold_standard_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = COALESCE(extraction_config, '{}'::jsonb)
         || '{"method":"gold_standard_parser","url":"https://www.goldstandard.gold","currency":"EUR"}'::jsonb,
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
 WHERE LOWER(name) = LOWER('Gold Standard');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Gold Standard',
  'https://www.goldstandard.gold',
  'gold_standard_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"gold_standard_parser","url":"https://www.goldstandard.gold","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Gold Standard')
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
    ('https://www.goldstandard.gold','gold_standard_gold_24kt_reference','Quotazione dell''oro in borsa','gold','24kt',1.000000,'EUR/g','Quotazione dell''oro in borsa','Quotazione\s+dell[’'']oro\s+in\s+borsa[\s\S]{0,120}?€\s*([0-9]+[,.]?[0-9]*)'),
    ('https://www.goldstandard.gold','gold_standard_gold_18kt_buyback','Acquistiamo ORO 18K prezzo MIN','gold','18kt',0.750000,'EUR/g','Acquistiamo ORO 18K','Acquistiamo\s+ORO\s*18\s*K[\s\S]{0,120}?prezzo\s*MIN[\s\S]{0,80}?€\s*([0-9]+[,.]?[0-9]*)'),
    ('https://www.goldstandard.gold','gold_standard_gold_24kt_buyback','Acquistiamo ORO 24K al prezzo MIN','gold','24kt',1.000000,'EUR/g','Acquistiamo ORO 24K','Acquistiamo\s+ORO\s*24\s*K[\s\S]{0,120}?prezzo\s*MIN[\s\S]{0,80}?€\s*([0-9]+[,.]?[0-9]*)')
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Gold Standard')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
