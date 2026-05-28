CREATE TABLE IF NOT EXISTS founder_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  generated_by BIGINT NULL,
  summary JSONB DEFAULT '{}'::jsonb,
  stores_data JSONB DEFAULT '[]'::jsonb,
  operators_data JSONB DEFAULT '[]'::jsonb,
  risks_data JSONB DEFAULT '{}'::jsonb,
  quality_data JSONB DEFAULT '{}'::jsonb,
  suspended_data JSONB DEFAULT '{}'::jsonb,
  approvals_data JSONB DEFAULT '{}'::jsonb,
  notifications_data JSONB DEFAULT '{}'::jsonb,
  audit_data JSONB DEFAULT '{}'::jsonb,
  backup_data JSONB DEFAULT '{}'::jsonb,
  academy_data JSONB DEFAULT '{}'::jsonb,
  ai_data JSONB DEFAULT '{}'::jsonb,
  pdf_path TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date)
);

ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS report_date DATE;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generated';
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS generated_by BIGINT;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS stores_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS operators_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS risks_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS quality_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS suspended_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS approvals_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS notifications_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS audit_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS backup_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS academy_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS ai_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS founder_daily_reports_date_unique
  ON founder_daily_reports (report_date);
CREATE INDEX IF NOT EXISTS idx_founder_daily_reports_date
  ON founder_daily_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_founder_daily_reports_status
  ON founder_daily_reports (status);
