CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS atti_vendita (
  id BIGSERIAL PRIMARY KEY,
  cliente_nome TEXT,
  cliente_cognome TEXT,
  codice_fiscale TEXT,
  telefono TEXT,
  peso_oro NUMERIC(12, 3) DEFAULT 0,
  quotazione NUMERIC(14, 2) DEFAULT 0,
  totale NUMERIC(14, 2) DEFAULT 0,
  data_atto DATE,
  practice_number TEXT UNIQUE,
  store TEXT,
  store_code TEXT,
  act_year INTEGER,
  act_number INTEGER,
  payment_method TEXT,
  status TEXT DEFAULT 'draft',
  payload JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by BIGINT,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS cliente_cognome TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS peso_oro NUMERIC(12, 3) DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quotazione NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS totale NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS data_atto DATE;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS practice_number TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS store TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS store_code TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS act_year INTEGER;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS act_number INTEGER;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE atti_vendita ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS cliente_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS negozio_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS codice_negozio TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS numero_atto_negozio INTEGER;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS operatore_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_by BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_score INTEGER DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_risk_level TEXT DEFAULT 'basso';
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_summary TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_updated_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_status TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_score INTEGER DEFAULT 0;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_summary TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_updated_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_request_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_required_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_by BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS resumed_by BIGINT;

UPDATE atti_vendita
SET completed_at = COALESCE(completed_at, updated_at, created_at, NOW())
WHERE completed_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'Completato'
    OR COALESCE(status, '') ILIKE 'Completata'
    OR COALESCE(status, '') ILIKE 'completed'
    OR COALESCE(status, '') ILIKE 'archived_completed'
    OR COALESCE(status, '') ILIKE 'archiviato completato'
    OR COALESCE(status, '') ILIKE 'archiviata completata'
  );

UPDATE atti_vendita
SET archived_at = COALESCE(archived_at, updated_at, created_at, NOW())
WHERE archived_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'Archiviata'
    OR COALESCE(status, '') ILIKE 'Archiviato'
    OR COALESCE(status, '') ILIKE 'archived'
    OR COALESCE(status, '') ILIKE 'archived_incomplete'
    OR COALESCE(status, '') ILIKE 'archived_completed'
  );

UPDATE atti_vendita
SET status = 'completed'
WHERE COALESCE(status, '') ILIKE 'Completato'
   OR COALESCE(status, '') ILIKE 'Completata';

UPDATE atti_vendita
SET status = 'archived_completed'
WHERE COALESCE(status, '') ILIKE 'archiviato completato'
   OR COALESCE(status, '') ILIKE 'archiviata completata'
   OR COALESCE(status, '') ILIKE 'archived_completed'
   OR (
     completed_at IS NOT NULL
     AND (
       COALESCE(status, '') ILIKE 'archived'
       OR COALESCE(status, '') ILIKE 'Archiviato'
       OR COALESCE(status, '') ILIKE 'Archiviata'
     )
   );

UPDATE atti_vendita
SET deleted_at = COALESCE(deleted_at, updated_at, created_at, NOW())
WHERE deleted_at IS NULL
  AND (COALESCE(status, '') ILIKE 'Deleted' OR COALESCE(status, '') ILIKE 'deleted');

UPDATE atti_vendita
SET status = 'suspended',
    suspended_reason = COALESCE(suspended_reason, 'Pratica non completata: spostata tra le pratiche sospese.'),
    suspended_reasons = CASE
      WHEN suspended_reasons IS NULL OR suspended_reasons = '[]'::jsonb THEN '["Pratica non completata: controlli da risolvere."]'::jsonb
      ELSE suspended_reasons
    END,
    suspended_at = COALESCE(suspended_at, archived_at, updated_at, created_at, NOW())
WHERE deleted_at IS NULL
  AND completed_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'archived_incomplete'
    OR COALESCE(status, '') ILIKE 'archived'
    OR COALESCE(status, '') ILIKE 'Archiviato'
    OR COALESCE(status, '') ILIKE 'Archiviata'
    OR COALESCE(status, '') ILIKE 'approval_approved'
    OR COALESCE(status, '') ILIKE 'autorizzazione_approvata'
    OR COALESCE(status, '') ILIKE 'approval_rejected'
    OR COALESCE(status, '') ILIKE 'autorizzazione_rifiutata'
  );

DROP INDEX IF EXISTS atti_vendita_practice_number_unique;
DROP INDEX IF EXISTS atti_vendita_practice_number_active_unique;
DROP INDEX IF EXISTS atti_vendita_completed_real_idx;
ALTER TABLE atti_vendita DROP CONSTRAINT IF EXISTS atti_vendita_practice_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS atti_vendita_practice_number_active_unique
  ON atti_vendita (practice_number)
  WHERE practice_number IS NOT NULL
    AND deleted_at IS NULL
    AND (
      COALESCE(status, '') ILIKE 'completed'
      OR COALESCE(status, '') ILIKE 'Completato'
      OR COALESCE(status, '') ILIKE 'archived_completed'
      OR COALESCE(status, '') ILIKE 'archived_incomplete'
      OR COALESCE(status, '') ILIKE 'Archiviata'
      OR COALESCE(status, '') ILIKE 'pending_approval'
      OR COALESCE(status, '') ILIKE 'suspended'
      OR COALESCE(status, '') ILIKE 'sospesa'
      OR COALESCE(status, '') ILIKE 'approval_approved'
      OR COALESCE(status, '') ILIKE 'approval_rejected'
    );

CREATE INDEX IF NOT EXISTS atti_vendita_store_year_number_idx
  ON atti_vendita (store_code, act_year, act_number);

CREATE INDEX IF NOT EXISTS atti_vendita_data_atto_idx
  ON atti_vendita (data_atto);

CREATE INDEX IF NOT EXISTS atti_vendita_codice_fiscale_idx
  ON atti_vendita (LOWER(codice_fiscale));

CREATE INDEX IF NOT EXISTS idx_atti_codice_fiscale
  ON atti_vendita (codice_fiscale);

CREATE INDEX IF NOT EXISTS atti_vendita_store_idx
  ON atti_vendita (store);

CREATE INDEX IF NOT EXISTS atti_vendita_store_code_idx
  ON atti_vendita (store_code);

CREATE INDEX IF NOT EXISTS atti_vendita_status_idx
  ON atti_vendita (status);

CREATE INDEX IF NOT EXISTS atti_vendita_suspended_status_idx
  ON atti_vendita (status, suspended_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS atti_vendita_suspended_store_idx
  ON atti_vendita (negozio_id, suspended_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS atti_vendita_completed_real_idx
  ON atti_vendita (store_code, act_year, act_number)
  WHERE deleted_at IS NULL
    AND (
      COALESCE(status, '') ILIKE 'completed'
      OR COALESCE(status, '') ILIKE 'Completato'
      OR COALESCE(status, '') ILIKE 'archived_completed'
      OR (COALESCE(status, '') ILIKE 'Archiviata' AND completed_at IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS atti_vendita_cliente_id_idx
  ON atti_vendita (cliente_id);

CREATE INDEX IF NOT EXISTS atti_vendita_negozio_id_idx
  ON atti_vendita (negozio_id);

CREATE INDEX IF NOT EXISTS atti_vendita_operatore_id_idx
  ON atti_vendita (operatore_id);

CREATE INDEX IF NOT EXISTS atti_vendita_payload_idx
  ON atti_vendita USING GIN (payload);

CREATE TABLE IF NOT EXISTS suspended_practice_logs (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NOT NULL REFERENCES atti_vendita(id) ON DELETE CASCADE,
  user_id BIGINT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  reasons JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspended_practice_logs_sale_deed_id
  ON suspended_practice_logs (sale_deed_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspended_practice_logs_action
  ON suspended_practice_logs (action);

CREATE INDEX IF NOT EXISTS idx_suspended_practice_logs_created_at
  ON suspended_practice_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS negozi (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  codice TEXT NOT NULL UNIQUE,
  indirizzo TEXT,
  citta TEXT,
  provincia TEXT,
  telefono TEXT,
  email TEXT,
  responsabile_id BIGINT,
  attivo BOOLEAN DEFAULT TRUE,
  data_creazione TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE negozi ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS codice TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS indirizzo TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS citta TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS responsabile_id BIGINT;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS attivo BOOLEAN DEFAULT TRUE;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS data_creazione TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS negozi_codice_unique
  ON negozi (codice);

CREATE INDEX IF NOT EXISTS negozi_attivo_idx
  ON negozi (attivo);

CREATE TABLE IF NOT EXISTS clienti (
  id BIGSERIAL PRIMARY KEY,
  codice_fiscale TEXT UNIQUE,
  nome TEXT,
  cognome TEXT,
  telefono TEXT,
  email TEXT,
  iban TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clienti ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS cognome TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS indirizzo TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS documento_tipo TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS documento_numero TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS intestatario_conto TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS archiviato BOOLEAN DEFAULT FALSE;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS clienti_codice_fiscale_unique
  ON clienti (UPPER(codice_fiscale))
  WHERE codice_fiscale IS NOT NULL AND codice_fiscale <> '';

CREATE INDEX IF NOT EXISTS clienti_codice_fiscale_lookup_idx
  ON clienti (codice_fiscale);

CREATE INDEX IF NOT EXISTS idx_clienti_codice_fiscale
  ON clienti (codice_fiscale);

CREATE TABLE IF NOT EXISTS utenti (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('founder', 'supervisore', 'responsabile', 'commesso', 'aiuto_commesso')),
  negozio TEXT NOT NULL DEFAULT 'Busto Arsizio',
  face_id_credential TEXT,
  telefono TEXT,
  note TEXT,
  attivo BOOLEAN DEFAULT TRUE,
  data_creazione TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ
);

ALTER TABLE utenti ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS cognome TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS ruolo TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS negozio TEXT DEFAULT 'Busto Arsizio';
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS negozio_id BIGINT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS face_id_credential TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS attivo BOOLEAN DEFAULT TRUE;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS data_creazione TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

UPDATE utenti SET ruolo = 'responsabile' WHERE ruolo = 'admin';
UPDATE utenti SET ruolo = 'commesso' WHERE ruolo IN ('commessa', 'utente', 'operatore');

ALTER TABLE utenti DROP CONSTRAINT IF EXISTS utenti_ruolo_check;
ALTER TABLE utenti ADD CONSTRAINT utenti_ruolo_check
  CHECK (ruolo IN ('founder', 'supervisore', 'responsabile', 'commesso', 'aiuto_commesso'));

CREATE UNIQUE INDEX IF NOT EXISTS utenti_email_unique
  ON utenti (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS utenti_username_unique
  ON utenti (LOWER(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS utenti_negozio_id_idx
  ON utenti (negozio_id);

CREATE TABLE IF NOT EXISTS backup_jobs (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT DEFAULT 'giornaliero',
  filename TEXT,
  percorso TEXT,
  stato TEXT DEFAULT 'in corso',
  dettaglio TEXT,
  dimensione_bytes BIGINT DEFAULT 0,
  n8n_ready BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'giornaliero';
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS percorso TEXT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'in corso';
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS dettaglio TEXT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS dimensione_bytes BIGINT DEFAULT 0;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS n8n_ready BOOLEAN DEFAULT TRUE;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS backup_jobs_created_at_idx
  ON backup_jobs (created_at DESC);

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

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  user_name TEXT,
  user_role TEXT,
  store_id BIGINT,
  store_name TEXT,
  action TEXT DEFAULT 'api_request',
  entity_type TEXT DEFAULT 'system',
  entity_id TEXT,
  entity_label TEXT,
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL,
  method TEXT,
  route TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
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

CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
  ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_route_created_idx
  ON audit_logs (route, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON audit_logs(store_id);

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

CREATE TABLE IF NOT EXISTS fusion_lots (
  id BIGSERIAL PRIMARY KEY,
  lotto_code TEXT UNIQUE,
  negozio_id BIGINT,
  negozio TEXT,
  raffineria TEXT,
  peso_totale NUMERIC(14, 3) DEFAULT 0,
  peso_netto NUMERIC(14, 3) DEFAULT 0,
  valore_teorico NUMERIC(14, 2) DEFAULT 0,
  valore_reale NUMERIC(14, 2),
  utile_reale NUMERIC(14, 2),
  stato TEXT DEFAULT 'aperto',
  data_invio DATE,
  data_ritorno DATE,
  payload JSONB DEFAULT '{}'::jsonb,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fusion_lots_negozio_idx
  ON fusion_lots (negozio_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_integrity_logs (
  id BIGSERIAL PRIMARY KEY,
  atto_id BIGINT,
  practice_number TEXT,
  hash_sha256 TEXT,
  timestamp_firma TIMESTAMPTZ,
  geolocation JSONB DEFAULT '{}'::jsonb,
  operator_id BIGINT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_integrity_atto_idx
  ON document_integrity_logs (atto_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_documents (
  id BIGSERIAL PRIMARY KEY,
  titolo TEXT NOT NULL,
  autore TEXT,
  filename TEXT,
  uploaded_by BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS titolo TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS autore TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS uploaded_by BIGINT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS ai_document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_tsv TSVECTOR,
  embedding_json JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS document_id BIGINT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS embedding_json JSONB;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE ai_document_chunks
SET content_tsv = to_tsvector('italian', COALESCE(content, ''))
WHERE content_tsv IS NULL;

CREATE INDEX IF NOT EXISTS ai_document_chunks_document_idx
  ON ai_document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS ai_document_chunks_content_fts_idx
  ON ai_document_chunks USING GIN (content_tsv);

CREATE TABLE IF NOT EXISTS ai_knowledge_notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  source TEXT,
  author_id BIGINT,
  author_role TEXT,
  status TEXT DEFAULT 'in revisione',
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS author_id BIGINT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS author_role TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in revisione';
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS approved_by BIGINT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ai_knowledge_notes_status_idx
  ON ai_knowledge_notes (status);

CREATE INDEX IF NOT EXISTS ai_knowledge_notes_author_idx
  ON ai_knowledge_notes (author_id);

CREATE INDEX IF NOT EXISTS ai_knowledge_notes_category_idx
  ON ai_knowledge_notes (category);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  question TEXT,
  answer TEXT,
  feedback_type TEXT,
  comment TEXT,
  status TEXT DEFAULT 'da_valutare',
  knowledge_note_id BIGINT,
  reviewed_by BIGINT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS answer TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'da_valutare';
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS knowledge_note_id BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS reviewed_by BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ai_feedback_user_idx
  ON ai_feedback (user_id);

CREATE INDEX IF NOT EXISTS ai_feedback_type_idx
  ON ai_feedback (feedback_type);

CREATE INDEX IF NOT EXISTS ai_feedback_status_idx
  ON ai_feedback (status);

CREATE TABLE IF NOT EXISTS antiriciclaggio_alerts (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT,
  codice_fiscale TEXT,
  atto_id BIGINT,
  totale_ultimi_7_giorni NUMERIC(14, 2) DEFAULT 0,
  importo_corrente NUMERIC(14, 2) DEFAULT 0,
  totale_previsto NUMERIC(14, 2) DEFAULT 0,
  superamento NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id BIGINT
);

ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS cliente_id BIGINT;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS atto_id BIGINT;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS totale_ultimi_7_giorni NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS importo_corrente NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS totale_previsto NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS superamento NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE antiriciclaggio_alerts ADD COLUMN IF NOT EXISTS user_id BIGINT;

CREATE INDEX IF NOT EXISTS antiriciclaggio_alerts_cf_idx
  ON antiriciclaggio_alerts (codice_fiscale);

CREATE INDEX IF NOT EXISTS antiriciclaggio_alerts_atto_idx
  ON antiriciclaggio_alerts (atto_id);

CREATE INDEX IF NOT EXISTS atti_vendita_cash_window_idx
  ON atti_vendita (codice_fiscale, data_atto, payment_method, status);

CREATE TABLE IF NOT EXISTS giacenza_trasferimenti (
  id BIGSERIAL PRIMARY KEY,
  negozio_partenza_id BIGINT,
  negozio_destinazione_id BIGINT,
  metallo TEXT,
  titolo TEXT,
  grammi NUMERIC(14, 3) DEFAULT 0,
  data_trasferimento DATE,
  operatore_id BIGINT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS negozio_partenza_id BIGINT;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS negozio_destinazione_id BIGINT;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS metallo TEXT;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS titolo TEXT;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS grammi NUMERIC(14, 3) DEFAULT 0;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS data_trasferimento DATE;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS operatore_id BIGINT;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE giacenza_trasferimenti ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS antifrode_alerts (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT,
  atto_id BIGINT,
  tipo_alert TEXT,
  livello TEXT,
  descrizione TEXT,
  stato TEXT DEFAULT 'nuovo',
  creato_da_sistema BOOLEAN DEFAULT TRUE,
  reviewed_by BIGINT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS cliente_id BIGINT;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS atto_id BIGINT;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS tipo_alert TEXT;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS livello TEXT;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS descrizione TEXT;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'nuovo';
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS creato_da_sistema BOOLEAN DEFAULT TRUE;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS reviewed_by BIGINT;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE antifrode_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS antifrode_alerts_stato_idx
  ON antifrode_alerts (stato);

CREATE INDEX IF NOT EXISTS antifrode_alerts_livello_idx
  ON antifrode_alerts (livello);

CREATE TABLE IF NOT EXISTS aurum_shield_scores (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT UNIQUE REFERENCES atti_vendita(id) ON DELETE SET NULL,
  client_id BIGINT NULL REFERENCES clienti(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL,
  summary TEXT,
  factors JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_shield_alerts (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NULL REFERENCES atti_vendita(id) ON DELETE SET NULL,
  client_id BIGINT NULL REFERENCES clienti(id) ON DELETE SET NULL,
  user_id BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  store_id BIGINT NULL REFERENCES negozi(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  reviewed_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_shield_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aurum_shield_scores_sale_deed_id ON aurum_shield_scores(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_scores_client_id ON aurum_shield_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_scores_risk_level ON aurum_shield_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_sale_deed_id ON aurum_shield_alerts(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_client_id ON aurum_shield_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_status ON aurum_shield_alerts(status);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_severity ON aurum_shield_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_alerts_created_at ON aurum_shield_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_aurum_shield_settings_key ON aurum_shield_settings(key);

CREATE TABLE IF NOT EXISTS quality_checks (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NULL REFERENCES atti_vendita(id) ON DELETE SET NULL,
  checked_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  checks JSONB DEFAULT '[]'::jsonb,
  blocking_errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  required_actions JSONB DEFAULT '[]'::jsonb,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_sale_deed_id ON quality_checks(sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_status ON quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_quality_checks_created_at ON quality_checks(created_at);

CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NOT NULL REFERENCES atti_vendita(id) ON DELETE CASCADE,
  requested_by BIGINT NOT NULL,
  requested_by_role TEXT,
  requested_to_role TEXT NOT NULL,
  store_id BIGINT NULL REFERENCES negozi(id) ON DELETE SET NULL,
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

INSERT INTO aurum_shield_settings (key, value)
VALUES
  ('cash_limit_amount', '500'::jsonb),
  ('cash_window_days', '7'::jsonb),
  ('frequent_sales_limit', '3'::jsonb),
  ('document_expiry_warning_days', '30'::jsonb),
  ('block_critical_practices', 'false'::jsonb),
  ('dashboard_alerts_enabled', 'true'::jsonb),
  ('ai_explanation_enabled', 'false'::jsonb),
  ('factor_weights', '{
    "expired_document": 40,
    "document_expiring": 15,
    "duplicate_document": 35,
    "missing_fiscal_code": 25,
    "new_client": 5,
    "frequent_sales": 30,
    "multi_store_sales": 35,
    "cash_near_limit": 20,
    "cash_over_limit": 45,
    "iban_holder_mismatch": 20,
    "shared_iban": 30,
    "missing_precious_photos": 15,
    "missing_signature": 35,
    "missing_weight_or_title": 20,
    "anomalous_amount_weight": 20,
    "frequent_updates": 10,
    "negative_quality": 35,
    "missing_quality": 10,
    "missing_payment_receipt": 20,
    "previous_alerts": 25,
    "fast_completion": 15,
    "operator_anomalies": 15,
    "store_anomalies": 15
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS training_courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_by BIGINT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_lessons (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  lesson_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_quizzes (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES training_courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  course_id BIGINT,
  score NUMERIC(6, 2) DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS training_results_user_idx
  ON training_results (user_id);

CREATE TABLE IF NOT EXISTS course_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_sections (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES course_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category_id, title)
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES course_categories(id) ON DELETE SET NULL,
  section_id BIGINT REFERENCES course_sections(id) ON DELETE SET NULL,
  faculty_id BIGINT,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'Base',
  duration_minutes INTEGER DEFAULT 0,
  duration_label TEXT,
  teacher TEXT,
  thumbnail_url TEXT,
  final_certification BOOLEAN DEFAULT TRUE,
  module_title TEXT,
  lesson_title TEXT,
  video_url TEXT,
  pdf_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_materials (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT,
  material_type TEXT DEFAULT 'link',
  file_url TEXT,
  allow_download BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS faculty_id BIGINT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Base';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_label TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS final_certification BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS module_title TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lesson_title TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pdf_url TEXT;

CREATE TABLE IF NOT EXISTS academy_faculties (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_courses (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  faculty_id BIGINT REFERENCES academy_faculties(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'Base',
  duration_minutes INTEGER DEFAULT 0,
  teacher TEXT,
  thumbnail_url TEXT,
  final_certification BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_modules (
  id BIGSERIAL PRIMARY KEY,
  academy_course_id BIGINT REFERENCES academy_courses(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_lessons (
  id BIGSERIAL PRIMARY KEY,
  academy_module_id BIGINT REFERENCES academy_modules(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  pdf_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_materials (
  id BIGSERIAL PRIMARY KEY,
  academy_lesson_id BIGINT REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT,
  material_type TEXT DEFAULT 'link',
  file_url TEXT,
  external_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  uploaded_by BIGINT,
  allow_download BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS uploaded_by BIGINT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS academy_user_progress (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  status TEXT DEFAULT 'non iniziato',
  percentuale NUMERIC(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS academy_user_lesson_progress (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS academy_exam_results (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  exam_type TEXT DEFAULT 'presenza',
  esito TEXT DEFAULT 'non_svolto',
  evaluated_by BIGINT,
  evaluated_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_certificates (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  certificate_code TEXT UNIQUE,
  issued_by BIGINT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS academy_badges (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  badge_name TEXT,
  badge_code TEXT UNIQUE,
  assigned_by BIGINT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido'
);

CREATE TABLE IF NOT EXISTS academy_user_notes (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id BIGINT REFERENCES academy_lessons(id) ON DELETE SET NULL,
  user_id BIGINT,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS academy_operator_levels (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE,
  level_name TEXT DEFAULT 'Junior',
  completed_courses INTEGER DEFAULT 0,
  badges_count INTEGER DEFAULT 0,
  certificates_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_course_progress (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  percentuale NUMERIC(5,2) DEFAULT 0,
  materials_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'non iniziato',
  started_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS course_quizzes (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  question TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_quiz_results (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  score NUMERIC(6,2) DEFAULT 0,
  esito TEXT DEFAULT 'non_superato',
  completed_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_certificates (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  certificate_code TEXT UNIQUE,
  issued_by BIGINT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido',
  revoked_by BIGINT,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS course_badges (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  badge_name TEXT,
  badge_code TEXT UNIQUE,
  assigned_by BIGINT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido'
);

CREATE TABLE IF NOT EXISTS course_exam_sessions (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  exam_type TEXT DEFAULT 'presenza',
  esito TEXT DEFAULT 'non_svolto',
  evaluated_by BIGINT,
  evaluated_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_sections_category_idx ON course_sections (category_id);
CREATE INDEX IF NOT EXISTS courses_category_idx ON courses (category_id);
CREATE INDEX IF NOT EXISTS courses_section_idx ON courses (section_id);
CREATE INDEX IF NOT EXISTS user_course_progress_user_idx ON user_course_progress (user_id);
CREATE INDEX IF NOT EXISTS course_certificates_user_idx ON course_certificates (user_id);
CREATE INDEX IF NOT EXISTS course_badges_user_idx ON course_badges (user_id);
CREATE INDEX IF NOT EXISTS course_exam_sessions_user_idx ON course_exam_sessions (user_id);
CREATE INDEX IF NOT EXISTS courses_faculty_idx ON courses (faculty_id);
CREATE INDEX IF NOT EXISTS academy_courses_course_idx ON academy_courses (course_id);
CREATE INDEX IF NOT EXISTS academy_modules_course_idx ON academy_modules (course_id);
CREATE INDEX IF NOT EXISTS academy_lessons_course_idx ON academy_lessons (course_id);
CREATE INDEX IF NOT EXISTS academy_materials_course_idx ON academy_materials (course_id);
CREATE INDEX IF NOT EXISTS academy_user_progress_user_idx ON academy_user_progress (user_id);
CREATE INDEX IF NOT EXISTS academy_user_lesson_progress_user_idx ON academy_user_lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS academy_certificates_user_idx ON academy_certificates (user_id);
CREATE INDEX IF NOT EXISTS academy_badges_user_idx ON academy_badges (user_id);

INSERT INTO course_categories (name, sort_order)
VALUES
  ('Argento', 10),
  ('Coaching Aziendale', 70),
  ('Diamanti', 40),
  ('Normative', 60),
  ('Oro', 1),
  ('Platino', 30),
  ('Procedure Operative', 50)
ON CONFLICT (name) DO NOTHING;

INSERT INTO academy_faculties (name, description, sort_order)
VALUES
  ('Facoltà Metalli Preziosi', 'Oro, argento e platino.', 10),
  ('Facoltà Gemmologia', 'Diamanti, pietre preziose e gemme.', 20),
  ('Facoltà Operativa', 'Procedure operative, antiriciclaggio, sicurezza e documentazione.', 30),
  ('Facoltà Business', 'Vendita, coaching aziendale, leadership e gestione negozio.', 40)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS store_experience TEXT;

ALTER TABLE clienti ADD COLUMN IF NOT EXISTS negozio_id BIGINT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS livello_cliente TEXT DEFAULT 'nuovo';
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS ultimo_contatto TIMESTAMPTZ;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS prossima_azione TEXT;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS note_interne TEXT;

CREATE TABLE IF NOT EXISTS client_notes (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT,
  user_id BIGINT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_tags (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_reminders (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT,
  user_id BIGINT,
  reminder_at TIMESTAMPTZ,
  testo TEXT,
  stato TEXT DEFAULT 'aperto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_communications (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT,
  user_id BIGINT,
  tipo TEXT,
  contenuto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clienti_negozio_id_idx
  ON clienti (negozio_id);

CREATE INDEX IF NOT EXISTS client_notes_cliente_idx
  ON client_notes (cliente_id);

CREATE INDEX IF NOT EXISTS client_tags_cliente_idx
  ON client_tags (cliente_id);

CREATE INDEX IF NOT EXISTS client_reminders_cliente_idx
  ON client_reminders (cliente_id);

CREATE INDEX IF NOT EXISTS client_communications_cliente_idx
  ON client_communications (cliente_id);

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
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS recipient_user_id BIGINT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS requested_role TEXT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS resolved_by BIGINT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS response_message TEXT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS responded_by BIGINT;
ALTER TABLE aurum_support_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS aurum_support_requests_user_idx
  ON aurum_support_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_recipient_idx
  ON aurum_support_requests (recipient_user_id, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_sender_recipient_idx
  ON aurum_support_requests (user_id, recipient_user_id, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_status_idx
  ON aurum_support_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_role_idx
  ON aurum_support_requests (requested_role, status);
CREATE INDEX IF NOT EXISTS aurum_support_requests_deleted_idx
  ON aurum_support_requests (deleted_at, status, created_at DESC);
CREATE INDEX IF NOT EXISTS aurum_support_requests_response_idx
  ON aurum_support_requests (responded_at DESC)
  WHERE response_message IS NOT NULL AND deleted_at IS NULL;

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
  store_health_data JSONB DEFAULT '{}'::jsonb,
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
ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS store_health_data JSONB DEFAULT '{}'::jsonb;
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

CREATE TABLE IF NOT EXISTS store_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  factors JSONB DEFAULT '{}'::jsonb,
  penalties JSONB DEFAULT '[]'::jsonb,
  bonuses JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, date_from, date_to)
);

ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'critico';
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS date_from DATE;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS date_to DATE;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS factors JSONB DEFAULT '{}'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS penalties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS bonuses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_store_health_scores_store_id ON store_health_scores(store_id);
CREATE INDEX IF NOT EXISTS idx_store_health_scores_date ON store_health_scores(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_store_health_scores_score ON store_health_scores(score);
CREATE UNIQUE INDEX IF NOT EXISTS store_health_scores_store_date_unique
  ON store_health_scores (store_id, date_from, date_to);

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

CREATE INDEX IF NOT EXISTS aurum_user_memories_type_idx
  ON aurum_user_memories (memory_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS aurum_user_memories_founder_review_idx
  ON aurum_user_memories (user_id, memory_type, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_trust_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_pack_code TEXT UNIQUE NOT NULL,
  sale_deed_id BIGINT NOT NULL,
  client_id BIGINT NULL,
  store_id BIGINT NULL,
  generated_by BIGINT NULL,
  pdf_path TEXT NULL,
  delivery_status TEXT DEFAULT 'generated',
  delivered_via TEXT NULL,
  delivered_to TEXT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS trust_pack_code TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS sale_deed_id BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS client_id BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS generated_by BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'generated';
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivered_via TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivered_to TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS customer_trust_packs_code_unique
  ON customer_trust_packs (trust_pack_code);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_sale_deed_id
  ON customer_trust_packs (sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_client_id
  ON customer_trust_packs (client_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_store_id
  ON customer_trust_packs (store_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_generated_at
  ON customer_trust_packs (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_active
  ON customer_trust_packs (sale_deed_id, deleted_at);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS training_scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'base',
  expected_steps JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'base';
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS expected_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  scenario_id TEXT NOT NULL,
  scenario_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 100,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  duration_seconds INTEGER DEFAULT 0,
  feedback JSONB DEFAULT '{}'::jsonb,
  mistakes JSONB DEFAULT '[]'::jsonb,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS scenario_id TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS scenario_title TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'started';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT false;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS mistakes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_store_id ON training_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_started_at ON training_sessions(started_at DESC);

INSERT INTO training_scenarios (id, title, description, difficulty, expected_steps, active)
VALUES
  ('cliente_standard', 'Cliente standard — atto semplice', 'Cliente demo completo, documento valido, bonifico e rischio basso.', 'base', '["controlla anagrafica", "verifica documento", "carica contabile demo", "firma cliente", "completa training"]'::jsonb, true),
  ('documento_scaduto', 'Documento scaduto', 'Documento demo con scadenza passata: l’operatore deve correggerlo prima di completare.', 'intermedio', '["individua documento scaduto", "aggiorna scadenza", "riesegui controllo qualità"]'::jsonb, true),
  ('contabile_mancante', 'Contabile mancante', 'Pagamento bonifico senza contabile: il controllo qualità deve bloccare finché non viene caricata.', 'intermedio', '["verifica pagamento", "carica contabile", "conferma controllo qualità"]'::jsonb, true),
  ('limite_contanti', 'Limite contanti', 'Pagamento contanti vicino o sopra soglia con warning Aurum Shield demo.', 'avanzato', '["controlla limite contanti", "riconosci warning", "richiedi verifica se necessario"]'::jsonb, true),
  ('alto_rischio', 'Pratica ad alto rischio', 'Cliente demo con operazioni ravvicinate simulate e richiesta autorizzazione formativa.', 'avanzato', '["leggi Aurum Shield", "richiedi autorizzazione simulata", "non completare senza verifica"]'::jsonb, true),
  ('firme_mancanti', 'Firme mancanti', 'Atto quasi completo con firme cliente mancanti.', 'base', '["controlla firme", "acquisisci firme demo", "completa training"]'::jsonb, true),
  ('preziosi_incompleti', 'Preziosi incompleti', 'Oggetto prezioso demo senza peso o caratura.', 'intermedio', '["completa metallo", "inserisci titolo", "inserisci peso"]'::jsonb, true),
  ('training_completo', 'Training completo', 'Percorso end-to-end con cliente, documenti, preziosi, pagamento, firme, qualità e Trust Pack demo.', 'master', '["compila cliente", "verifica documento", "completa preziosi", "controlla pagamento", "firma", "qualità", "trust pack demo"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    difficulty = EXCLUDED.difficulty,
    expected_steps = EXCLUDED.expected_steps,
    active = EXCLUDED.active,
    updated_at = NOW();
