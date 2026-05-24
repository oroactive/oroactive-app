ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS cliente_id BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS iban TEXT;

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
