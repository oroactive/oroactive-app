ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ;

UPDATE atti_vendita
SET completed_at = COALESCE(completed_at, updated_at, created_at, NOW())
WHERE completed_at IS NULL
  AND COALESCE(status, '') ILIKE 'Completato';

UPDATE atti_vendita
SET archived_at = COALESCE(archived_at, updated_at, created_at, NOW())
WHERE archived_at IS NULL
  AND COALESCE(status, '') ILIKE 'Archiviata';

UPDATE atti_vendita
SET deleted_at = COALESCE(deleted_at, updated_at, created_at, NOW())
WHERE deleted_at IS NULL
  AND COALESCE(status, '') ILIKE 'Deleted';

DROP INDEX IF EXISTS atti_vendita_practice_number_unique;
ALTER TABLE atti_vendita DROP CONSTRAINT IF EXISTS atti_vendita_practice_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS atti_vendita_practice_number_active_unique
  ON atti_vendita (practice_number)
  WHERE practice_number IS NOT NULL
    AND deleted_at IS NULL
    AND (
      COALESCE(status, '') ILIKE 'Completato'
      OR (COALESCE(status, '') ILIKE 'Archiviata' AND completed_at IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS atti_vendita_completed_real_idx
  ON atti_vendita (store_code, act_year, act_number)
  WHERE deleted_at IS NULL
    AND (
      COALESCE(status, '') ILIKE 'Completato'
      OR (COALESCE(status, '') ILIKE 'Archiviata' AND completed_at IS NOT NULL)
    );
