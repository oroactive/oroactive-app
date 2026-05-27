ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_status TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_score INTEGER DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_summary TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS quality_checks (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NULL REFERENCES atti_vendita(id) ON DELETE SET NULL,
  checked_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  checks JSONB DEFAULT '[]'::jsonb,
  blocking_errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  required_actions JSONB DEFAULT '[]'::jsonb,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_sale_deed_id ON quality_checks(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_status ON quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_quality_checks_created_at ON quality_checks(created_at);
