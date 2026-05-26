ALTER TABLE utenti ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE utenti
SET updated_at = COALESCE(updated_at, data_creazione, NOW())
WHERE updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS utenti_email_unique
  ON utenti (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS utenti_username_unique
  ON utenti (LOWER(username))
  WHERE username IS NOT NULL AND username <> '';
