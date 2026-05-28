ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_request_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_required_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NOT NULL REFERENCES atti_vendita(id) ON DELETE CASCADE,
  requested_by BIGINT NOT NULL,
  requested_by_role TEXT,
  requested_to_role TEXT NOT NULL,
  store_id BIGINT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT,
  reasons JSONB DEFAULT '[]'::jsonb,
  quality_check JSONB DEFAULT '{}'::jsonb,
  aurum_shield JSONB DEFAULT '{}'::jsonb,
  requester_note TEXT,
  reviewer_note TEXT,
  reviewed_by BIGINT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sale_deed_id BIGINT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requested_by BIGINT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requested_by_role TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requested_to_role TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS quality_check JSONB DEFAULT '{}'::jsonb;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS aurum_shield JSONB DEFAULT '{}'::jsonb;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_note TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS reviewer_note TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS reviewed_by BIGINT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_approval_requests_sale_deed_id ON approval_requests(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_store_id ON approval_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);
