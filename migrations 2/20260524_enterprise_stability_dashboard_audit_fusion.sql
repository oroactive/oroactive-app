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

CREATE INDEX IF NOT EXISTS atti_vendita_payment_method_idx
  ON atti_vendita (payment_method);

CREATE INDEX IF NOT EXISTS atti_vendita_updated_at_idx
  ON atti_vendita (updated_at DESC);
