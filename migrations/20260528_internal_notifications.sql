CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  target_role TEXT NULL,
  store_id BIGINT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  severity TEXT DEFAULT 'info',
  entity_type TEXT NULL,
  entity_id TEXT NULL,
  action_url TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Notifica OroActive';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
