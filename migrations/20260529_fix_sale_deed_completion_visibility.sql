UPDATE atti_vendita
SET completed_at = COALESCE(completed_at, updated_at, created_at, NOW())
WHERE completed_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'Completato'
    OR COALESCE(status, '') ILIKE 'Completata'
    OR COALESCE(status, '') ILIKE 'completed'
    OR COALESCE(status, '') ILIKE 'archived_completed'
    OR COALESCE(status, '') ILIKE 'archiviato completato'
    OR COALESCE(status, '') ILIKE 'archiviata completata'
  );

UPDATE atti_vendita
SET archived_at = COALESCE(archived_at, updated_at, created_at, NOW())
WHERE archived_at IS NULL
  AND (
    COALESCE(status, '') ILIKE 'archived'
    OR COALESCE(status, '') ILIKE 'Archiviato'
    OR COALESCE(status, '') ILIKE 'Archiviata'
    OR COALESCE(status, '') ILIKE 'archived_incomplete'
    OR COALESCE(status, '') ILIKE 'archived_completed'
  );

UPDATE atti_vendita
SET status = 'completed'
WHERE COALESCE(status, '') ILIKE 'Completato'
   OR COALESCE(status, '') ILIKE 'Completata';

UPDATE atti_vendita
SET status = 'archived_completed'
WHERE COALESCE(status, '') ILIKE 'archiviato completato'
   OR COALESCE(status, '') ILIKE 'archiviata completata'
   OR COALESCE(status, '') ILIKE 'archived_completed'
   OR (
     completed_at IS NOT NULL
     AND (
       COALESCE(status, '') ILIKE 'archived'
       OR COALESCE(status, '') ILIKE 'Archiviato'
       OR COALESCE(status, '') ILIKE 'Archiviata'
     )
   );

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
    COALESCE(status, '') ILIKE 'archived'
    OR COALESCE(status, '') ILIKE 'Archiviato'
    OR COALESCE(status, '') ILIKE 'Archiviata'
    OR COALESCE(status, '') ILIKE 'archived_incomplete'
    OR COALESCE(status, '') ILIKE 'approval_approved'
    OR COALESCE(status, '') ILIKE 'autorizzazione_approvata'
    OR COALESCE(status, '') ILIKE 'approval_rejected'
    OR COALESCE(status, '') ILIKE 'autorizzazione_rifiutata'
  );
