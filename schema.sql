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
  status TEXT DEFAULT 'archived_incomplete',
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
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'archived_incomplete';
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

UPDATE atti_vendita
SET completed_at = COALESCE(completed_at, updated_at, created_at, NOW())
WHERE completed_at IS NULL
  AND (COALESCE(status, '') ILIKE 'Completato' OR COALESCE(status, '') ILIKE 'completed');

UPDATE atti_vendita
SET archived_at = COALESCE(archived_at, updated_at, created_at, NOW())
WHERE archived_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'Archiviata'
    OR COALESCE(status, '') ILIKE 'archived_incomplete'
    OR COALESCE(status, '') ILIKE 'archived_completed'
  );

UPDATE atti_vendita
SET deleted_at = COALESCE(deleted_at, updated_at, created_at, NOW())
WHERE deleted_at IS NULL
  AND (COALESCE(status, '') ILIKE 'Deleted' OR COALESCE(status, '') ILIKE 'deleted');

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
  method TEXT,
  route TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
  ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_route_created_idx
  ON audit_logs (route, created_at DESC);

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
