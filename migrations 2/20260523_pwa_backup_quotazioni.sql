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

CREATE INDEX IF NOT EXISTS backup_jobs_created_at_idx ON backup_jobs (created_at DESC);
