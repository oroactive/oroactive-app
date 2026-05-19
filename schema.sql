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
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS atti_vendita_practice_number_unique
  ON atti_vendita (practice_number);

CREATE INDEX IF NOT EXISTS atti_vendita_store_year_number_idx
  ON atti_vendita (store_code, act_year, act_number);

CREATE INDEX IF NOT EXISTS atti_vendita_data_atto_idx
  ON atti_vendita (data_atto);

CREATE INDEX IF NOT EXISTS atti_vendita_payload_idx
  ON atti_vendita USING GIN (payload);

CREATE TABLE IF NOT EXISTS utenti (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('founder', 'admin', 'responsabile', 'commesso', 'commessa', 'utente', 'operatore')),
  negozio TEXT NOT NULL DEFAULT 'Busto Arsizio',
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
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS data_creazione TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

ALTER TABLE utenti DROP CONSTRAINT IF EXISTS utenti_ruolo_check;
ALTER TABLE utenti ADD CONSTRAINT utenti_ruolo_check
  CHECK (ruolo IN ('founder', 'admin', 'responsabile', 'commesso', 'commessa', 'utente', 'operatore'));

CREATE UNIQUE INDEX IF NOT EXISTS utenti_email_unique
  ON utenti (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS utenti_username_unique
  ON utenti (LOWER(username))
  WHERE username IS NOT NULL;
