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

CREATE INDEX IF NOT EXISTS idx_competitor_extraction_rules_source_id
  ON competitor_extraction_rules(source_id);

CREATE INDEX IF NOT EXISTS idx_competitor_extraction_rules_competitor
  ON competitor_extraction_rules(competitor_name);

INSERT INTO competitor_extraction_rules (
  source_id, competitor_name, page_url, field_key, label, metal, purity_code, purity_value,
  unit, anchor_text, regex_pattern, extraction_method, required, active, created_at, updated_at
)
SELECT source.id, source.name, source.website_url, rule.field_key, rule.label, rule.metal, rule.purity_code, rule.purity_value,
       'EUR/g', rule.anchor_text, rule.regex_pattern, 'anchor_regex', true, true, NOW(), NOW()
  FROM competitor_quote_sources source
 CROSS JOIN (
    VALUES
      ('gold_24kt', 'Oro puro', 'gold', '24kt', 1.000000::numeric, 'oro puro', 'oro\s+puro[\s\S]{0,180}?([0-9]+[,.]?[0-9]*)\s*€\s*/\s*gr'),
      ('gold_18kt', 'Oro usato', 'gold', '18kt', 0.750000::numeric, 'oro usato', 'oro\s+usato[\s\S]{0,180}?([0-9]+[,.]?[0-9]*)\s*€\s*/\s*gr'),
      ('silver_999', 'Argento puro', 'silver', '999', 0.999000::numeric, 'argento puro', 'argento\s+puro[\s\S]{0,180}?([0-9]+[,.]?[0-9]*)\s*€\s*/\s*gr'),
      ('silver_used_generic', 'Argento usato', 'silver', 'used_generic', NULL::numeric, 'argento usato', 'argento\s+usato[\s\S]{0,180}?([0-9]+[,.]?[0-9]*)\s*€\s*/\s*gr')
  ) AS rule(field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern)
 WHERE LOWER(source.name) = LOWER('Oro Express')
   AND NOT EXISTS (
    SELECT 1
      FROM competitor_extraction_rules existing
     WHERE existing.source_id = source.id
       AND existing.field_key = rule.field_key
  );
