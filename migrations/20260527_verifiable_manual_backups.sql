CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_code TEXT UNIQUE NOT NULL,
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by BIGINT,
  created_by_role TEXT,
  store_id BIGINT NULL,
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  checksum_sha256 TEXT,
  includes_database BOOLEAN DEFAULT true,
  includes_files BOOLEAN DEFAULT true,
  includes_documents BOOLEAN DEFAULT true,
  includes_pdfs BOOLEAN DEFAULT true,
  includes_signatures BOOLEAN DEFAULT true,
  includes_ai BOOLEAN DEFAULT true,
  includes_academy BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'not_verified',
  restore_test_status TEXT DEFAULT 'not_tested',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL,
  restore_tested_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE backups ADD COLUMN IF NOT EXISTS backup_code TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS backup_type TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS created_by_role TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_database BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_files BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_documents BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_pdfs BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_signatures BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_ai BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_academy BOOLEAN DEFAULT true;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_verified';
ALTER TABLE backups ADD COLUMN IF NOT EXISTS restore_test_status TEXT DEFAULT 'not_tested';
ALTER TABLE backups ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE backups ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS restore_tested_at TIMESTAMPTZ;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS backups_backup_code_unique
  ON backups (backup_code);

CREATE INDEX IF NOT EXISTS idx_backups_status
  ON backups (status);

CREATE INDEX IF NOT EXISTS idx_backups_created_at
  ON backups (created_at DESC);

CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backup_logs ADD COLUMN IF NOT EXISTS backup_id UUID;
ALTER TABLE backup_logs ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE backup_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE backup_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE backup_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_id
  ON backup_logs (backup_id);

CREATE TABLE IF NOT EXISTS backup_restore_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID,
  status TEXT NOT NULL,
  tested_by BIGINT,
  test_database_name TEXT,
  result_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS backup_id UUID;
ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS tested_by BIGINT;
ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS test_database_name TEXT;
ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS result_message TEXT;
ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE backup_restore_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS backup_restore_tests_backup_id_idx
  ON backup_restore_tests (backup_id);
