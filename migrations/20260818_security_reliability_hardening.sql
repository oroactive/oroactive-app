BEGIN;

ALTER TABLE utenti ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS decision_fingerprint TEXT;

WITH ranked_pending AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY sale_deed_id ORDER BY created_at DESC NULLS LAST, id DESC) AS position
  FROM approval_requests
  WHERE status = 'pending'
    AND sale_deed_id IS NOT NULL
)
UPDATE approval_requests ar
SET status = 'cancelled',
    reviewer_note = COALESCE(NULLIF(reviewer_note, ''), 'Richiesta duplicata chiusa automaticamente durante la migrazione.'),
    updated_at = NOW()
FROM ranked_pending duplicate
WHERE duplicate.id = ar.id
  AND duplicate.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS approval_requests_one_pending_per_act
  ON approval_requests (sale_deed_id)
  WHERE status = 'pending' AND sale_deed_id IS NOT NULL;

DO $$
DECLARE
  renamed_count INTEGER;
BEGIN
  LOOP
    WITH duplicate_names AS (
      SELECT LOWER(TRIM(nome)) AS normalized_name
      FROM negozi
      WHERE deleted_at IS NULL
      GROUP BY LOWER(TRIM(nome))
      HAVING COUNT(*) > 1
    )
    UPDATE negozi n
    SET nome = CONCAT(TRIM(n.nome), ' — ', COALESCE(NULLIF(TRIM(n.codice), ''), 'SEDE'), ' #', n.id)
    FROM duplicate_names duplicate
    WHERE n.deleted_at IS NULL
      AND LOWER(TRIM(n.nome)) = duplicate.normalized_name;
    GET DIAGNOSTICS renamed_count = ROW_COUNT;
    EXIT WHEN renamed_count = 0;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS negozi_nome_normalized_unique
  ON negozi (LOWER(TRIM(nome)))
  WHERE deleted_at IS NULL;

WITH unique_names AS (
  SELECT LOWER(TRIM(nome)) AS normalized_name, MIN(id) AS id
  FROM negozi
  WHERE deleted_at IS NULL
  GROUP BY LOWER(TRIM(nome))
  HAVING COUNT(*) = 1
)
UPDATE utenti u
SET negozio_id = unique_names.id
FROM unique_names
WHERE u.negozio_id IS NULL
  AND LOWER(TRIM(u.negozio)) = unique_names.normalized_name;

UPDATE atti_vendita a
SET negozio_id = n.id
FROM negozi n
WHERE a.negozio_id IS NULL
  AND COALESCE(NULLIF(a.codice_negozio, ''), a.store_code) = n.codice
  AND n.deleted_at IS NULL;

WITH unique_names AS (
  SELECT LOWER(TRIM(nome)) AS normalized_name, MIN(id) AS id
  FROM negozi
  WHERE deleted_at IS NULL
  GROUP BY LOWER(TRIM(nome))
  HAVING COUNT(*) = 1
)
UPDATE atti_vendita a
SET negozio_id = unique_names.id
FROM unique_names
WHERE a.negozio_id IS NULL
  AND LOWER(TRIM(a.store)) = unique_names.normalized_name;

COMMIT;
