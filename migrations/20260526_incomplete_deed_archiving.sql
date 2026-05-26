ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ;

UPDATE atti_vendita
SET status = 'completed',
    completed_at = COALESCE(completed_at, updated_at, created_at, NOW())
WHERE COALESCE(status, '') ILIKE 'Completato';

UPDATE atti_vendita
SET status = CASE
      WHEN completed_at IS NOT NULL THEN 'archived_completed'
      ELSE 'archived_incomplete'
    END,
    archived_at = COALESCE(archived_at, updated_at, created_at, NOW())
WHERE COALESCE(status, '') ILIKE 'Archiviata';

UPDATE atti_vendita
SET status = 'deleted',
    deleted_at = COALESCE(deleted_at, updated_at, created_at, NOW())
WHERE COALESCE(status, '') ILIKE 'Deleted';

UPDATE atti_vendita
SET status = 'abandoned',
    abandoned_at = COALESCE(abandoned_at, updated_at, created_at, NOW())
WHERE COALESCE(status, '') ILIKE 'Abandoned';

DROP INDEX IF EXISTS atti_vendita_practice_number_unique;
DROP INDEX IF EXISTS atti_vendita_practice_number_active_unique;
DROP INDEX IF EXISTS atti_vendita_completed_real_idx;
ALTER TABLE atti_vendita DROP CONSTRAINT IF EXISTS atti_vendita_practice_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS atti_vendita_practice_number_active_unique
  ON atti_vendita (practice_number)
  WHERE practice_number IS NOT NULL
    AND deleted_at IS NULL
    AND COALESCE(status, '') IN ('completed', 'archived_completed', 'archived_incomplete');

CREATE INDEX IF NOT EXISTS atti_vendita_completed_real_idx
  ON atti_vendita (store_code, act_year, act_number)
  WHERE deleted_at IS NULL
    AND COALESCE(status, '') IN ('completed', 'archived_completed')
    AND completed_at IS NOT NULL;
