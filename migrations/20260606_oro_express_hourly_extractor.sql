ALTER TABLE competitor_buyback_quotes ADD COLUMN IF NOT EXISTS source_url TEXT NULL;

UPDATE competitor_quote_sources
   SET website_url = COALESCE(NULLIF(website_url, ''), 'https://www.oro-express.it'),
       source_type = 'oro_express_parser',
       active = true,
       auto_sync_enabled = true,
       sync_interval_minutes = 60,
       extraction_config = CASE
         WHEN extraction_config IS NULL OR extraction_config = '{}'::jsonb THEN
           '{"method":"oro_express_parser","url":"https://www.oro-express.it","silver_used_mapping":"generic","currency":"EUR"}'::jsonb
         ELSE extraction_config || '{"method":"oro_express_parser","silver_used_mapping":"generic","currency":"EUR"}'::jsonb
       END,
       next_sync_at = COALESCE(next_sync_at, NOW()),
       last_sync_status = COALESCE(NULLIF(last_sync_status, ''), 'not_synced'),
       notes = CASE
         WHEN notes IS NULL OR notes = '' OR notes ILIKE '%Competitor preconfigurato OroActive%' THEN
           'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora'
         ELSE notes
       END,
       updated_at = NOW()
 WHERE LOWER(name) = LOWER('Oro Express');

INSERT INTO competitor_quote_sources (
  name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
  notes, selectors, extraction_config, last_sync_status, next_sync_at, created_by, created_at, updated_at
)
SELECT
  'Oro Express',
  'https://www.oro-express.it',
  'oro_express_parser',
  true,
  true,
  60,
  'Competitor preconfigurato OroActive con parser automatico dedicato ogni ora',
  '{}'::jsonb,
  '{"method":"oro_express_parser","url":"https://www.oro-express.it","silver_used_mapping":"generic","currency":"EUR"}'::jsonb,
  'not_synced',
  NOW(),
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Oro Express')
);
