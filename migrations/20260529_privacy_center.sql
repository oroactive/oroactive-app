CREATE TABLE IF NOT EXISTS privacy_policy_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT FALSE,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE privacy_policy_versions ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE privacy_policy_versions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE privacy_policy_versions ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}'::jsonb;
ALTER TABLE privacy_policy_versions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
ALTER TABLE privacy_policy_versions ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE privacy_policy_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS privacy_policy_acceptances (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE privacy_policy_acceptances ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE privacy_policy_acceptances ADD COLUMN IF NOT EXISTS policy_version TEXT;
ALTER TABLE privacy_policy_acceptances ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE privacy_policy_acceptances ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE privacy_policy_acceptances ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_active ON privacy_policy_versions(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_policy_versions_version ON privacy_policy_versions(version);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_acceptances_user_id ON privacy_policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_acceptances_version ON privacy_policy_acceptances(policy_version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_policy_acceptances_user_version ON privacy_policy_acceptances(user_id, policy_version);
