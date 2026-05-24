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

CREATE UNIQUE INDEX IF NOT EXISTS negozi_codice_unique ON negozi (codice);
CREATE INDEX IF NOT EXISTS negozi_attivo_idx ON negozi (attivo);

ALTER TABLE utenti ADD COLUMN IF NOT EXISTS negozio_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS negozio_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS codice_negozio TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS numero_atto_negozio INTEGER;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS operatore_id BIGINT;

CREATE INDEX IF NOT EXISTS utenti_negozio_id_idx ON utenti (negozio_id);
CREATE INDEX IF NOT EXISTS atti_vendita_negozio_id_idx ON atti_vendita (negozio_id);
CREATE INDEX IF NOT EXISTS atti_vendita_operatore_id_idx ON atti_vendita (operatore_id);
CREATE INDEX IF NOT EXISTS atti_vendita_multi_store_idx ON atti_vendita (negozio_id, data_atto, status);

INSERT INTO negozi (nome, codice, citta, provincia, attivo)
VALUES
  ('Busto Arsizio', 'BUSTO', 'Busto Arsizio', 'VA', TRUE),
  ('Cassano Magnago', 'CASSANO', 'Cassano Magnago', 'VA', TRUE),
  ('Legnano', 'LEGNANO', 'Legnano', 'MI', TRUE)
ON CONFLICT (codice) DO NOTHING;

UPDATE utenti u
SET negozio_id = n.id
FROM negozi n
WHERE u.negozio_id IS NULL
  AND u.negozio = n.nome;

UPDATE atti_vendita a
SET negozio_id = n.id,
    codice_negozio = COALESCE(a.codice_negozio, n.codice),
    numero_atto_negozio = COALESCE(a.numero_atto_negozio, a.act_number),
    operatore_id = COALESCE(a.operatore_id, CASE WHEN (a.payload->>'operatorId') ~ '^[0-9]+$' THEN (a.payload->>'operatorId')::bigint ELSE NULL END)
FROM negozi n
WHERE a.negozio_id IS NULL
  AND (a.store = n.nome OR a.store_code = n.codice);

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

CREATE INDEX IF NOT EXISTS antifrode_alerts_stato_idx ON antifrode_alerts (stato);
CREATE INDEX IF NOT EXISTS antifrode_alerts_livello_idx ON antifrode_alerts (livello);

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

CREATE INDEX IF NOT EXISTS training_results_user_idx ON training_results (user_id);

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

CREATE INDEX IF NOT EXISTS clienti_negozio_id_idx ON clienti (negozio_id);
CREATE INDEX IF NOT EXISTS client_notes_cliente_idx ON client_notes (cliente_id);
CREATE INDEX IF NOT EXISTS client_tags_cliente_idx ON client_tags (cliente_id);
CREATE INDEX IF NOT EXISTS client_reminders_cliente_idx ON client_reminders (cliente_id);
CREATE INDEX IF NOT EXISTS client_communications_cliente_idx ON client_communications (cliente_id);
