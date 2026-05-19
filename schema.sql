CREATE TABLE IF NOT EXISTS atti_vendita (
  id TEXT PRIMARY KEY,
  practice_number TEXT UNIQUE NOT NULL,
  store TEXT NOT NULL,
  store_code TEXT NOT NULL,
  act_year INTEGER NOT NULL,
  act_number INTEGER NOT NULL,
  act_date DATE,
  customer_name TEXT,
  customer_surname TEXT,
  amount NUMERIC(12, 2),
  payment_method TEXT,
  total_weight NUMERIC(12, 2),
  status TEXT DEFAULT 'Archiviata',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS atti_vendita_store_year_idx ON atti_vendita (store_code, act_year, act_number);
CREATE INDEX IF NOT EXISTS atti_vendita_payload_idx ON atti_vendita USING GIN (payload);
