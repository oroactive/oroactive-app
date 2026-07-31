ALTER TABLE negozi ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE negozi ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

CREATE INDEX IF NOT EXISTS negozi_deleted_at_idx
  ON negozi (deleted_at);

CREATE OR REPLACE FUNCTION oroactive_require_active_store()
RETURNS TRIGGER AS $$
DECLARE
  referenced_store_id BIGINT;
BEGIN
  referenced_store_id := NULLIF(to_jsonb(NEW)->>TG_ARGV[0], '')::bigint;
  IF referenced_store_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'utenti'
     AND COALESCE((to_jsonb(NEW)->>'attivo')::boolean, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM negozi
  WHERE id = referenced_store_id
    AND deleted_at IS NULL
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Negozio non più disponibile.',
      CONSTRAINT = 'oroactive_active_store_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utenti_active_store_guard ON utenti;
CREATE TRIGGER utenti_active_store_guard
  BEFORE INSERT OR UPDATE OF negozio_id, attivo ON utenti
  FOR EACH ROW EXECUTE FUNCTION oroactive_require_active_store('negozio_id');

DROP TRIGGER IF EXISTS atti_vendita_active_store_guard ON atti_vendita;
CREATE TRIGGER atti_vendita_active_store_guard
  BEFORE INSERT OR UPDATE OF negozio_id ON atti_vendita
  FOR EACH ROW EXECUTE FUNCTION oroactive_require_active_store('negozio_id');

DROP TRIGGER IF EXISTS fusion_lots_active_store_guard ON fusion_lots;
CREATE TRIGGER fusion_lots_active_store_guard
  BEFORE INSERT OR UPDATE OF negozio_id ON fusion_lots
  FOR EACH ROW EXECUTE FUNCTION oroactive_require_active_store('negozio_id');

DROP TRIGGER IF EXISTS approval_requests_active_store_guard ON approval_requests;
CREATE TRIGGER approval_requests_active_store_guard
  BEFORE INSERT OR UPDATE OF store_id ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION oroactive_require_active_store('store_id');
