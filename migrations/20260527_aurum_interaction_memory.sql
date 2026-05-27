CREATE TABLE IF NOT EXISTS aurum_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  requested_role TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by BIGINT NULL
);

ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS requested_role TEXT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS resolved_by BIGINT;

CREATE INDEX IF NOT EXISTS aurum_support_requests_user_idx
  ON aurum_support_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_status_idx
  ON aurum_support_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_role_idx
  ON aurum_support_requests (requested_role, status);

CREATE TABLE IF NOT EXISTS aurum_user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  memory_text TEXT NOT NULL,
  memory_type TEXT DEFAULT 'work_preference',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS memory_text TEXT;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'work_preference';
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS aurum_user_memories_user_idx
  ON aurum_user_memories (user_id, deleted_at, updated_at DESC);
