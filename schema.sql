CREATE TABLE IF NOT EXISTS sale_acts (
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

CREATE INDEX IF NOT EXISTS sale_acts_store_year_idx ON sale_acts (store_code, act_year, act_number);
CREATE INDEX IF NOT EXISTS sale_acts_payload_idx ON sale_acts USING GIN (payload);
