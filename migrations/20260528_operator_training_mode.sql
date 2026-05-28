CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS training_scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'base',
  expected_steps JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'base';
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS expected_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE training_scenarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  scenario_id TEXT NOT NULL,
  scenario_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 100,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  duration_seconds INTEGER DEFAULT 0,
  feedback JSONB DEFAULT '{}'::jsonb,
  mistakes JSONB DEFAULT '[]'::jsonb,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS scenario_id TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS scenario_title TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'started';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT false;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS mistakes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_store_id ON training_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_started_at ON training_sessions(started_at DESC);

INSERT INTO training_scenarios (id, title, description, difficulty, expected_steps, active)
VALUES
  ('cliente_standard', 'Cliente standard — atto semplice', 'Cliente demo completo, documento valido, bonifico e rischio basso.', 'base', '["controlla anagrafica", "verifica documento", "carica contabile demo", "firma cliente", "completa training"]'::jsonb, true),
  ('documento_scaduto', 'Documento scaduto', 'Documento demo con scadenza passata: l’operatore deve correggerlo prima di completare.', 'intermedio', '["individua documento scaduto", "aggiorna scadenza", "riesegui controllo qualità"]'::jsonb, true),
  ('contabile_mancante', 'Contabile mancante', 'Pagamento bonifico senza contabile: il controllo qualità deve bloccare finché non viene caricata.', 'intermedio', '["verifica pagamento", "carica contabile", "conferma controllo qualità"]'::jsonb, true),
  ('limite_contanti', 'Limite contanti', 'Pagamento contanti vicino o sopra soglia con warning Aurum Shield demo.', 'avanzato', '["controlla limite contanti", "riconosci warning", "richiedi verifica se necessario"]'::jsonb, true),
  ('alto_rischio', 'Pratica ad alto rischio', 'Cliente demo con operazioni ravvicinate simulate e richiesta autorizzazione formativa.', 'avanzato', '["leggi Aurum Shield", "richiedi autorizzazione simulata", "non completare senza verifica"]'::jsonb, true),
  ('firme_mancanti', 'Firme mancanti', 'Atto quasi completo con firme cliente mancanti.', 'base', '["controlla firme", "acquisisci firme demo", "completa training"]'::jsonb, true),
  ('preziosi_incompleti', 'Preziosi incompleti', 'Oggetto prezioso demo senza peso o caratura.', 'intermedio', '["completa metallo", "inserisci titolo", "inserisci peso"]'::jsonb, true),
  ('training_completo', 'Training completo', 'Percorso end-to-end con cliente, documenti, preziosi, pagamento, firme, qualità e Trust Pack demo.', 'master', '["compila cliente", "verifica documento", "completa preziosi", "controlla pagamento", "firma", "qualità", "trust pack demo"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    difficulty = EXCLUDED.difficulty,
    expected_steps = EXCLUDED.expected_steps,
    active = EXCLUDED.active,
    updated_at = NOW();
