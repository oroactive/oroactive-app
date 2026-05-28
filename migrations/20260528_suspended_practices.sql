ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_by BIGINT;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS resumed_by BIGINT;

DROP INDEX IF EXISTS atti_vendita_practice_number_active_unique;

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
      OR COALESCE(status, '') ILIKE 'pending_approval'
      OR COALESCE(status, '') ILIKE 'in_attesa_autorizzazione'
      OR COALESCE(status, '') ILIKE 'suspended'
      OR COALESCE(status, '') ILIKE 'sospesa'
      OR COALESCE(status, '') ILIKE 'approval_approved'
      OR COALESCE(status, '') ILIKE 'autorizzazione_approvata'
      OR COALESCE(status, '') ILIKE 'approval_rejected'
      OR COALESCE(status, '') ILIKE 'autorizzazione_rifiutata'
    );

CREATE INDEX IF NOT EXISTS atti_vendita_suspended_status_idx
  ON atti_vendita (status, suspended_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS atti_vendita_suspended_store_idx
  ON atti_vendita (negozio_id, suspended_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS suspended_practice_logs (
  id BIGSERIAL PRIMARY KEY,
  sale_deed_id BIGINT NOT NULL REFERENCES atti_vendita(id) ON DELETE CASCADE,
  user_id BIGINT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  reasons JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspended_practice_logs_sale_deed_id
  ON suspended_practice_logs (sale_deed_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspended_practice_logs_action
  ON suspended_practice_logs (action);

CREATE INDEX IF NOT EXISTS idx_suspended_practice_logs_created_at
  ON suspended_practice_logs (created_at DESC);
