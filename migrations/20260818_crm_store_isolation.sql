BEGIN;

-- Ogni sede conserva un profilo CRM distinto per lo stesso codice fiscale.
-- I dati CRM legacy senza provenienza certa non vengono attribuiti a una sede
-- arbitraria: restano recuperabili in quarantena e non sono esposti alle API.
ALTER TABLE clienti DROP CONSTRAINT IF EXISTS clienti_codice_fiscale_key;
DROP INDEX IF EXISTS clienti_codice_fiscale_unique;

CREATE TABLE IF NOT EXISTS crm_legacy_quarantine (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_record_id BIGINT NOT NULL,
  source_client_id BIGINT,
  source_user_id BIGINT,
  source_store_id BIGINT,
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, source_record_id)
);

CREATE TABLE IF NOT EXISTS oroactive_data_migrations (
  migration_key TEXT PRIMARY KEY,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

DROP TABLE IF EXISTS crm_legacy_clients_before_split;
CREATE TEMP TABLE crm_legacy_clients_before_split AS
WITH profile_counts AS (
  SELECT UPPER(codice_fiscale) AS codice_fiscale, COUNT(*) AS profile_count
  FROM clienti
  WHERE NULLIF(TRIM(codice_fiscale), '') IS NOT NULL
  GROUP BY UPPER(codice_fiscale)
)
SELECT c.id, UPPER(c.codice_fiscale) AS codice_fiscale, c.negozio_id AS original_store_id
FROM clienti c
JOIN profile_counts counts ON counts.codice_fiscale = UPPER(c.codice_fiscale)
WHERE counts.profile_count = 1
  AND NOT EXISTS (
    SELECT 1 FROM oroactive_data_migrations
    WHERE migration_key = '20260818_crm_store_isolation_v2'
  );

UPDATE atti_vendita a
SET negozio_id = n.id
FROM negozi n
WHERE a.negozio_id IS NULL
  AND COALESCE(NULLIF(a.codice_negozio, ''), NULLIF(a.store_code, '')) = n.codice
  AND n.deleted_at IS NULL
  AND COALESCE(n.attivo, TRUE) = TRUE;

WITH unique_names AS (
  SELECT LOWER(TRIM(nome)) AS normalized_name, MIN(id) AS id
  FROM negozi
  WHERE deleted_at IS NULL
    AND COALESCE(attivo, TRUE) = TRUE
  GROUP BY LOWER(TRIM(nome))
  HAVING COUNT(*) = 1
)
UPDATE atti_vendita a
SET negozio_id = unique_names.id
FROM unique_names
WHERE a.negozio_id IS NULL
  AND LOWER(TRIM(a.store)) = unique_names.normalized_name;

WITH ranked_owner AS (
  SELECT c.id AS cliente_id,
         a.negozio_id,
         ROW_NUMBER() OVER (
           PARTITION BY c.id
           ORDER BY COALESCE(a.completed_at, a.created_at, a.updated_at) ASC NULLS LAST, a.id ASC
         ) AS position
  FROM clienti c
  JOIN crm_legacy_clients_before_split legacy ON legacy.id = c.id
  JOIN atti_vendita a
    ON UPPER(a.codice_fiscale) = UPPER(c.codice_fiscale)
   AND a.negozio_id IS NOT NULL
   AND a.deleted_at IS NULL
   AND (
     COALESCE(a.status, '') ILIKE 'completed'
     OR COALESCE(a.status, '') ILIKE 'complete'
     OR COALESCE(a.status, '') ILIKE 'Completato'
     OR COALESCE(a.status, '') ILIKE 'Completata'
     OR COALESCE(a.status, '') ILIKE 'archived_completed'
     OR COALESCE(a.status, '') ILIKE 'archiviato completato'
     OR COALESCE(a.status, '') ILIKE 'archiviata completata'
     OR ((COALESCE(a.status, '') ILIKE 'archived'
          OR COALESCE(a.status, '') ILIKE 'Archiviato'
          OR COALESCE(a.status, '') ILIKE 'Archiviata')
         AND a.completed_at IS NOT NULL)
   )
)
UPDATE clienti c
SET negozio_id = ranked_owner.negozio_id,
    updated_at = NOW()
FROM ranked_owner
WHERE ranked_owner.cliente_id = c.id
  AND ranked_owner.position = 1
;

WITH ranked_acts AS (
  SELECT a.*,
         ROW_NUMBER() OVER (
           PARTITION BY UPPER(a.codice_fiscale), a.negozio_id
           ORDER BY a.updated_at DESC NULLS LAST, a.id DESC
         ) AS position
  FROM atti_vendita a
  WHERE NULLIF(TRIM(a.codice_fiscale), '') IS NOT NULL
    AND a.negozio_id IS NOT NULL
    AND a.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM oroactive_data_migrations
      WHERE migration_key = '20260818_crm_store_isolation_v2'
    )
    AND (
      COALESCE(a.status, '') ILIKE 'completed'
      OR COALESCE(a.status, '') ILIKE 'complete'
      OR COALESCE(a.status, '') ILIKE 'Completato'
      OR COALESCE(a.status, '') ILIKE 'Completata'
      OR COALESCE(a.status, '') ILIKE 'archived_completed'
      OR COALESCE(a.status, '') ILIKE 'archiviato completato'
      OR COALESCE(a.status, '') ILIKE 'archiviata completata'
      OR ((COALESCE(a.status, '') ILIKE 'archived'
           OR COALESCE(a.status, '') ILIKE 'Archiviato'
           OR COALESCE(a.status, '') ILIKE 'Archiviata')
          AND a.completed_at IS NOT NULL)
    )
), latest_store_acts AS (
  SELECT * FROM ranked_acts WHERE position = 1
)
INSERT INTO clienti (
  codice_fiscale, nome, cognome, telefono, email, iban, negozio_id,
  indirizzo, provincia, documento_tipo, documento_numero,
  metodo_pagamento, intestatario_conto, payload, created_at, updated_at
)
SELECT
  UPPER(a.codice_fiscale),
  NULLIF(a.cliente_nome, ''),
  NULLIF(a.cliente_cognome, ''),
  NULLIF(a.telefono, ''),
  NULLIF(a.payload->>'email', ''),
  NULLIF(a.iban, ''),
  a.negozio_id,
  NULLIF(a.payload->>'address', ''),
  NULLIF(a.payload->>'residenceProvince', ''),
  NULLIF(a.payload->>'documentType', ''),
  NULLIF(a.payload->>'documentNumber', ''),
  NULLIF(COALESCE(a.payment_method, a.payload->>'paymentMethod'), ''),
  NULLIF(COALESCE(a.payload->>'accountHolder', a.payload->>'intestatarioConto'), ''),
  jsonb_strip_nulls(jsonb_build_object(
    'name', NULLIF(a.cliente_nome, ''),
    'surname', NULLIF(a.cliente_cognome, ''),
    'birthDate', NULLIF(a.payload->>'birthDate', ''),
    'birthPlace', NULLIF(a.payload->>'birthPlace', ''),
    'birthProvince', NULLIF(a.payload->>'birthProvince', ''),
    'sex', NULLIF(a.payload->>'sex', ''),
    'citizenship', NULLIF(a.payload->>'citizenship', ''),
    'address', NULLIF(a.payload->>'address', ''),
    'residenceProvince', NULLIF(a.payload->>'residenceProvince', ''),
    'documentType', NULLIF(a.payload->>'documentType', ''),
    'documentNumber', NULLIF(a.payload->>'documentNumber', ''),
    'documentIssueDate', NULLIF(a.payload->>'documentIssueDate', ''),
    'documentExpiry', NULLIF(a.payload->>'documentExpiry', ''),
    'paymentMethod', NULLIF(COALESCE(a.payment_method, a.payload->>'paymentMethod'), ''),
    'accountHolder', NULLIF(COALESCE(a.payload->>'accountHolder', a.payload->>'intestatarioConto'), '')
  )),
  COALESCE(a.created_at, NOW()),
  COALESCE(a.updated_at, NOW())
FROM latest_store_acts a
WHERE NOT EXISTS (
  SELECT 1
  FROM clienti c
  WHERE UPPER(c.codice_fiscale) = UPPER(a.codice_fiscale)
    AND c.negozio_id = a.negozio_id
);

-- Riallinea anche il profilo storico ai dati della propria sede. In questo
-- modo valori scritti dall'ultima sede che usava la vecchia scheda globale non
-- restano visibili alla prima sede dopo la separazione.
WITH ranked_acts AS (
  SELECT a.*,
         ROW_NUMBER() OVER (
           PARTITION BY UPPER(a.codice_fiscale), a.negozio_id
           ORDER BY a.updated_at DESC NULLS LAST, a.id DESC
         ) AS position
  FROM atti_vendita a
  WHERE NULLIF(TRIM(a.codice_fiscale), '') IS NOT NULL
    AND a.negozio_id IS NOT NULL
    AND a.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM oroactive_data_migrations
      WHERE migration_key = '20260818_crm_store_isolation_v2'
    )
    AND (
      COALESCE(a.status, '') ILIKE 'completed'
      OR COALESCE(a.status, '') ILIKE 'complete'
      OR COALESCE(a.status, '') ILIKE 'Completato'
      OR COALESCE(a.status, '') ILIKE 'Completata'
      OR COALESCE(a.status, '') ILIKE 'archived_completed'
      OR COALESCE(a.status, '') ILIKE 'archiviato completato'
      OR COALESCE(a.status, '') ILIKE 'archiviata completata'
      OR ((COALESCE(a.status, '') ILIKE 'archived'
           OR COALESCE(a.status, '') ILIKE 'Archiviato'
           OR COALESCE(a.status, '') ILIKE 'Archiviata')
          AND a.completed_at IS NOT NULL)
    )
), latest_store_acts AS (
  SELECT * FROM ranked_acts WHERE position = 1
)
UPDATE clienti c
SET nome = NULLIF(a.cliente_nome, ''),
    cognome = NULLIF(a.cliente_cognome, ''),
    telefono = NULLIF(a.telefono, ''),
    email = NULLIF(a.payload->>'email', ''),
    iban = NULLIF(a.iban, ''),
    indirizzo = NULLIF(a.payload->>'address', ''),
    provincia = NULLIF(a.payload->>'residenceProvince', ''),
    documento_tipo = NULLIF(a.payload->>'documentType', ''),
    documento_numero = NULLIF(a.payload->>'documentNumber', ''),
    metodo_pagamento = NULLIF(COALESCE(a.payment_method, a.payload->>'paymentMethod'), ''),
    intestatario_conto = NULLIF(COALESCE(a.payload->>'accountHolder', a.payload->>'intestatarioConto'), ''),
    payload = (COALESCE(c.payload, '{}'::jsonb) - ARRAY[
      'name','surname','birthDate','birthPlace','birthProvince','sex','citizenship',
      'address','residenceProvince','documentType','documentNumber','documentIssueDate',
      'documentExpiry','paymentMethod','accountHolder'
    ]::text[]) || jsonb_strip_nulls(jsonb_build_object(
      'name', NULLIF(a.cliente_nome, ''),
      'surname', NULLIF(a.cliente_cognome, ''),
      'birthDate', NULLIF(a.payload->>'birthDate', ''),
      'birthPlace', NULLIF(a.payload->>'birthPlace', ''),
      'birthProvince', NULLIF(a.payload->>'birthProvince', ''),
      'sex', NULLIF(a.payload->>'sex', ''),
      'citizenship', NULLIF(a.payload->>'citizenship', ''),
      'address', NULLIF(a.payload->>'address', ''),
      'residenceProvince', NULLIF(a.payload->>'residenceProvince', ''),
      'documentType', NULLIF(a.payload->>'documentType', ''),
      'documentNumber', NULLIF(a.payload->>'documentNumber', ''),
      'documentIssueDate', NULLIF(a.payload->>'documentIssueDate', ''),
      'documentExpiry', NULLIF(a.payload->>'documentExpiry', ''),
      'paymentMethod', NULLIF(COALESCE(a.payment_method, a.payload->>'paymentMethod'), ''),
      'accountHolder', NULLIF(COALESCE(a.payload->>'accountHolder', a.payload->>'intestatarioConto'), '')
    )),
    updated_at = NOW()
FROM latest_store_acts a
WHERE UPPER(c.codice_fiscale) = UPPER(a.codice_fiscale)
  AND c.negozio_id = a.negozio_id;

-- Conserva fuori dalle API i metadati CRM globali e le righe figlie la cui
-- sede non è dimostrabile. I record con autore della stessa sede storica
-- restano invece associati al profilo corretto.
WITH multi_store_legacy AS (
  SELECT legacy.id
  FROM crm_legacy_clients_before_split legacy
  JOIN clienti source ON source.id = legacy.id
  JOIN clienti sibling ON UPPER(sibling.codice_fiscale) = legacy.codice_fiscale
  WHERE sibling.negozio_id IS NOT NULL
  GROUP BY legacy.id
  HAVING COUNT(DISTINCT sibling.negozio_id) > 1
)
INSERT INTO crm_legacy_quarantine
  (entity_type, source_record_id, source_client_id, source_store_id, reason, payload)
SELECT 'client_profile_metadata', c.id, c.id, c.negozio_id,
       'Metadati della scheda globale non attribuibili con certezza a una sede.',
       jsonb_strip_nulls(jsonb_build_object(
         'livello_cliente', c.livello_cliente,
         'ultimo_contatto', c.ultimo_contatto,
         'prossima_azione', c.prossima_azione,
         'note_interne', c.note_interne
       ))
FROM clienti c
JOIN multi_store_legacy legacy ON legacy.id = c.id
WHERE NULLIF(c.note_interne, '') IS NOT NULL
   OR NULLIF(c.prossima_azione, '') IS NOT NULL
   OR c.ultimo_contatto IS NOT NULL
   OR COALESCE(c.livello_cliente, 'nuovo') <> 'nuovo'
ON CONFLICT (entity_type, source_record_id) DO NOTHING;

WITH multi_store_legacy AS (
  SELECT legacy.id
  FROM crm_legacy_clients_before_split legacy
  JOIN clienti sibling ON UPPER(sibling.codice_fiscale) = legacy.codice_fiscale
  WHERE sibling.negozio_id IS NOT NULL
  GROUP BY legacy.id
  HAVING COUNT(DISTINCT sibling.negozio_id) > 1
)
UPDATE clienti c
SET livello_cliente = 'nuovo', ultimo_contatto = NULL, prossima_azione = NULL, note_interne = NULL
FROM multi_store_legacy legacy
WHERE c.id = legacy.id;

INSERT INTO crm_legacy_quarantine
  (entity_type, source_record_id, source_client_id, source_user_id, source_store_id, reason, payload)
SELECT 'client_note', n.id, n.cliente_id, n.user_id, c.negozio_id,
       'Autore non assegnato alla sede storica della scheda globale.',
       jsonb_build_object('note', n.note, 'created_at', n.created_at)
FROM client_notes n
JOIN crm_legacy_clients_before_split legacy ON legacy.id = n.cliente_id
JOIN clienti c ON c.id = n.cliente_id
LEFT JOIN utenti u ON u.id = n.user_id
WHERE u.negozio_id IS DISTINCT FROM c.negozio_id
  AND EXISTS (
    SELECT 1 FROM clienti sibling
    WHERE UPPER(sibling.codice_fiscale) = legacy.codice_fiscale
      AND sibling.negozio_id IS NOT NULL
      AND sibling.negozio_id IS DISTINCT FROM c.negozio_id
  )
ON CONFLICT (entity_type, source_record_id) DO NOTHING;

DELETE FROM client_notes n
USING crm_legacy_quarantine q
WHERE q.entity_type = 'client_note' AND q.source_record_id = n.id;

INSERT INTO crm_legacy_quarantine
  (entity_type, source_record_id, source_client_id, source_store_id, reason, payload)
SELECT 'client_tag', t.id, t.cliente_id, c.negozio_id,
       'Tag legacy privo di autore e sede verificabile.',
       jsonb_build_object('tag', t.tag, 'created_at', t.created_at)
FROM client_tags t
JOIN crm_legacy_clients_before_split legacy ON legacy.id = t.cliente_id
JOIN clienti c ON c.id = t.cliente_id
WHERE EXISTS (
  SELECT 1 FROM clienti sibling
  WHERE UPPER(sibling.codice_fiscale) = legacy.codice_fiscale
    AND sibling.negozio_id IS NOT NULL
    AND sibling.negozio_id IS DISTINCT FROM c.negozio_id
)
ON CONFLICT (entity_type, source_record_id) DO NOTHING;

DELETE FROM client_tags t
USING crm_legacy_quarantine q
WHERE q.entity_type = 'client_tag' AND q.source_record_id = t.id;

INSERT INTO crm_legacy_quarantine
  (entity_type, source_record_id, source_client_id, source_user_id, source_store_id, reason, payload)
SELECT 'client_reminder', r.id, r.cliente_id, r.user_id, c.negozio_id,
       'Autore non assegnato alla sede storica della scheda globale.',
       jsonb_build_object('reminder_at', r.reminder_at, 'testo', r.testo, 'stato', r.stato, 'created_at', r.created_at)
FROM client_reminders r
JOIN crm_legacy_clients_before_split legacy ON legacy.id = r.cliente_id
JOIN clienti c ON c.id = r.cliente_id
LEFT JOIN utenti u ON u.id = r.user_id
WHERE u.negozio_id IS DISTINCT FROM c.negozio_id
  AND EXISTS (
    SELECT 1 FROM clienti sibling
    WHERE UPPER(sibling.codice_fiscale) = legacy.codice_fiscale
      AND sibling.negozio_id IS NOT NULL
      AND sibling.negozio_id IS DISTINCT FROM c.negozio_id
  )
ON CONFLICT (entity_type, source_record_id) DO NOTHING;

DELETE FROM client_reminders r
USING crm_legacy_quarantine q
WHERE q.entity_type = 'client_reminder' AND q.source_record_id = r.id;

INSERT INTO crm_legacy_quarantine
  (entity_type, source_record_id, source_client_id, source_user_id, source_store_id, reason, payload)
SELECT 'client_communication', comm.id, comm.cliente_id, comm.user_id, c.negozio_id,
       'Autore non assegnato alla sede storica della scheda globale.',
       jsonb_build_object('tipo', comm.tipo, 'contenuto', comm.contenuto, 'created_at', comm.created_at)
FROM client_communications comm
JOIN crm_legacy_clients_before_split legacy ON legacy.id = comm.cliente_id
JOIN clienti c ON c.id = comm.cliente_id
LEFT JOIN utenti u ON u.id = comm.user_id
WHERE u.negozio_id IS DISTINCT FROM c.negozio_id
  AND EXISTS (
    SELECT 1 FROM clienti sibling
    WHERE UPPER(sibling.codice_fiscale) = legacy.codice_fiscale
      AND sibling.negozio_id IS NOT NULL
      AND sibling.negozio_id IS DISTINCT FROM c.negozio_id
  )
ON CONFLICT (entity_type, source_record_id) DO NOTHING;

DELETE FROM client_communications comm
USING crm_legacy_quarantine q
WHERE q.entity_type = 'client_communication' AND q.source_record_id = comm.id;

-- Le bozze non generano profili CRM e non devono conservare il riferimento
-- alla vecchia anagrafica globale dopo che questa è stata assegnata altrove.
UPDATE atti_vendita a
SET cliente_id = NULL
FROM clienti c
WHERE a.cliente_id = c.id
  AND a.negozio_id IS DISTINCT FROM c.negozio_id;

CREATE UNIQUE INDEX IF NOT EXISTS clienti_codice_fiscale_store_unique
  ON clienti (UPPER(codice_fiscale), negozio_id)
  WHERE codice_fiscale IS NOT NULL AND codice_fiscale <> '' AND negozio_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clienti_codice_fiscale_legacy_unique
  ON clienti (UPPER(codice_fiscale))
  WHERE codice_fiscale IS NOT NULL AND codice_fiscale <> '' AND negozio_id IS NULL;

UPDATE atti_vendita a
SET cliente_id = c.id
FROM clienti c
WHERE NULLIF(TRIM(a.codice_fiscale), '') IS NOT NULL
  AND a.negozio_id IS NOT NULL
  AND UPPER(c.codice_fiscale) = UPPER(a.codice_fiscale)
  AND c.negozio_id = a.negozio_id
  AND a.cliente_id IS DISTINCT FROM c.id;

UPDATE atti_vendita a
SET cliente_id = c.id
FROM clienti c
WHERE NULLIF(TRIM(a.codice_fiscale), '') IS NOT NULL
  AND a.negozio_id IS NULL
  AND c.negozio_id IS NULL
  AND UPPER(c.codice_fiscale) = UPPER(a.codice_fiscale)
  AND a.cliente_id IS DISTINCT FROM c.id;

UPDATE aurum_shield_scores s
SET client_id = a.cliente_id
FROM atti_vendita a
WHERE s.sale_deed_id = a.id
  AND a.cliente_id IS NOT NULL
  AND s.client_id IS DISTINCT FROM a.cliente_id;

UPDATE aurum_shield_alerts al
SET client_id = a.cliente_id
FROM atti_vendita a
WHERE al.sale_deed_id = a.id
  AND a.cliente_id IS NOT NULL
  AND al.client_id IS DISTINCT FROM a.cliente_id;

UPDATE customer_trust_packs ctp
SET client_id = a.cliente_id,
    store_id = COALESCE(a.negozio_id, ctp.store_id)
FROM atti_vendita a
WHERE ctp.sale_deed_id = a.id
  AND a.cliente_id IS NOT NULL
  AND (ctp.client_id IS DISTINCT FROM a.cliente_id OR ctp.store_id IS DISTINCT FROM COALESCE(a.negozio_id, ctp.store_id));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'atti_vendita_cliente_fk') THEN
    ALTER TABLE atti_vendita ADD CONSTRAINT atti_vendita_cliente_fk
      FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_notes_cliente_fk') THEN
    ALTER TABLE client_notes ADD CONSTRAINT client_notes_cliente_fk
      FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_tags_cliente_fk') THEN
    ALTER TABLE client_tags ADD CONSTRAINT client_tags_cliente_fk
      FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_reminders_cliente_fk') THEN
    ALTER TABLE client_reminders ADD CONSTRAINT client_reminders_cliente_fk
      FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_communications_cliente_fk') THEN
    ALTER TABLE client_communications ADD CONSTRAINT client_communications_cliente_fk
      FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

INSERT INTO oroactive_data_migrations (migration_key, metadata)
VALUES ('20260818_crm_store_isolation_v2', jsonb_build_object('completed_by', 'standalone_migration'))
ON CONFLICT (migration_key) DO NOTHING;

DROP TABLE IF EXISTS crm_legacy_clients_before_split;

COMMIT;
