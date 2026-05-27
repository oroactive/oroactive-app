ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS recipient_user_id BIGINT;

CREATE INDEX IF NOT EXISTS aurum_support_requests_recipient_idx
  ON aurum_support_requests (recipient_user_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS aurum_support_requests_sender_recipient_idx
  ON aurum_support_requests (user_id, recipient_user_id, deleted_at, created_at DESC);
