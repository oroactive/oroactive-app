ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  actor_id BIGINT,
  activity_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_activity_logs_user_created_idx
  ON user_activity_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_activity_logs_actor_created_idx
  ON user_activity_logs (actor_id, created_at DESC);
