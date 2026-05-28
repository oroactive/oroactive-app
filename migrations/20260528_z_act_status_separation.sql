ALTER TABLE atti_vendita ALTER COLUMN status SET DEFAULT 'draft';

UPDATE atti_vendita
SET status = 'suspended',
    suspended_reason = COALESCE(suspended_reason, 'Pratica non completata: spostata tra le pratiche sospese.'),
    suspended_reasons = CASE
      WHEN suspended_reasons IS NULL OR suspended_reasons = '[]'::jsonb THEN '["Pratica non completata: controlli da risolvere."]'::jsonb
      ELSE suspended_reasons
    END,
    suspended_at = COALESCE(suspended_at, archived_at, updated_at, created_at, NOW())
WHERE deleted_at IS NULL
  AND completed_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'archived_incomplete'
    OR COALESCE(status, '') ILIKE 'Archiviata'
    OR COALESCE(status, '') ILIKE 'approval_approved'
    OR COALESCE(status, '') ILIKE 'autorizzazione_approvata'
    OR COALESCE(status, '') ILIKE 'approval_rejected'
    OR COALESCE(status, '') ILIKE 'autorizzazione_rifiutata'
  );
