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
