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
  status TEXT DEFAULT 'Archiviata',
  payload JSONB DEFAULT '{}'::jsonb,
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
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Archiviata';
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS cliente_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS negozio_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS codice_negozio TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS numero_atto_negozio INTEGER;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS operatore_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS atti_vendita_practice_number_unique
  ON atti_vendita (practice_number);

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
  data_creazione TIMESTAMPTZ DEFAULT NOW(),
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
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS data_creazione TIMESTAMPTZ DEFAULT NOW();
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
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS backup_jobs_created_at_idx
  ON backup_jobs (created_at DESC);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS answer TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ai_feedback_user_idx
  ON ai_feedback (user_id);

CREATE INDEX IF NOT EXISTS ai_feedback_type_idx
  ON ai_feedback (feedback_type);

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
