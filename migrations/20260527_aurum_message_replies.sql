ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS response_message TEXT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS responded_by BIGINT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS aurum_support_requests_deleted_idx
  ON aurum_support_requests (deleted_at, status, created_at DESC);

CREATE INDEX IF NOT EXISTS aurum_support_requests_response_idx
  ON aurum_support_requests (responded_at DESC)
  WHERE response_message IS NOT NULL AND deleted_at IS NULL;
