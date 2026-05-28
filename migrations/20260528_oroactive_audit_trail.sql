CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  method TEXT,
  route TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'api_request';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'system';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_label TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_data JSONB DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_data JSONB DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_info TEXT;

UPDATE audit_logs
SET action = COALESCE(action, LOWER(COALESCE(method, 'api')) || '_request')
WHERE action IS NULL;

UPDATE audit_logs
SET entity_type = COALESCE(entity_type, 'api')
WHERE entity_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON audit_logs(store_id);
