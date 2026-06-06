ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'customer_buyback';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'medium';
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS extraction_run_id BIGINT NULL;

UPDATE competitor_quote_sources
   SET website_url = 'https://www.prontogold.com',
       source_type = 'pronto_gold_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = COALESCE(extraction_config, '{}'::jsonb)
         || '{"method":"pronto_gold_parser","url":"https://www.prontogold.com","quote_url":"https://www.prontogold.com/quotazioni","currency":"EUR"}'::jsonb,
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
 WHERE LOWER(name) = LOWER('Pronto Gold');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_at, updated_at
)
SELECT
  'Pronto Gold',
  'https://www.prontogold.com',
  'pronto_gold_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"pronto_gold_parser","url":"https://www.prontogold.com","quote_url":"https://www.prontogold.com/quotazioni","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Pronto Gold')
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
    ('https://www.prontogold.com/quotazioni','pronto_gold_reference_gold','Valore dell''ORO sulle Borse internazionali','gold','24kt',1.000000,'EUR/g','Valore dell''ORO','Valore\s+dell[’'']ORO[\s\S]{0,160}?([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_gold_24kt_buy','ORO PURO 24k Acquisto','gold','24kt',1.000000,'EUR/g','ORO PURO 24k','ORO\s+PURO\s*24k[\s\S]{0,160}?Acquisto\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_gold_24kt_sell','ORO PURO 24k Vendita','gold','24kt',1.000000,'EUR/g','ORO PURO 24k','ORO\s+PURO\s*24k[\s\S]{0,220}?Vendita\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_gold_18kt_range','Compro ORO usato 18k da/a','gold','18kt',0.750000,'EUR/g','Compro ORO usato 18k','Compro\s+ORO\s+usato\s*18k[\s\S]{0,160}?da\s*([0-9]+[,.]?[0-9]*)[\s\S]{0,120}?a\s*([0-9]+[,.]?[0-9]*)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_gold_14kt','Compro ORO usato 14k','gold','14kt',0.583333,'EUR/g','Compro ORO usato 14k','Compro\s+ORO\s+usato\s*14k[\s\S]{0,160}?Acquisto\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_gold_9kt','Compro ORO usato 9k','gold','9kt',0.375000,'EUR/g','Compro ORO usato 9k','Compro\s+ORO\s+usato\s*9k[\s\S]{0,160}?Acquisto\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_reference_silver','Valore dell''ARGENTO sulle Borse internazionali','silver','999',0.999000,'EUR/g','Valore dell''ARGENTO','Valore\s+dell[’'']ARGENTO[\s\S]{0,160}?([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_silver_999_buy','ARGENTO PURO Acquisto','silver','999',0.999000,'EUR/g','ARGENTO PURO','ARGENTO\s+PURO[\s\S]{0,160}?Acquisto\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_silver_999_sell','ARGENTO PURO Vendita','silver','999',0.999000,'EUR/g','ARGENTO PURO','ARGENTO\s+PURO[\s\S]{0,220}?Vendita\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_silver_925','Compro ARGENTO usato 925','silver','925',0.925000,'EUR/g','Compro ARGENTO usato 925','Compro\s+ARGENTO\s+usato\s*925[\s\S]{0,160}?Acquisto\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)'),
    ('https://www.prontogold.com/quotazioni','pronto_gold_silver_800','Compro ARGENTO usato 800','silver','800',0.800000,'EUR/g','Compro ARGENTO usato 800','Compro\s+ARGENTO\s+usato\s*800[\s\S]{0,160}?Acquisto\s*([0-9]+[,.]?[0-9]*)\s*(?:Euro|Eur|€)')
) AS rule(page_url, field_key, label, metal, purity_code, purity_value, unit, anchor_text, regex_pattern)
WHERE LOWER(source.name) = LOWER('Pronto Gold')
  AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
