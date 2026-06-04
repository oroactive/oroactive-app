CREATE TABLE IF NOT EXISTS aurum_blocks_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  score INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  lines_cleared INTEGER DEFAULT 0,
  best_combo INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  training_correct_answers INTEGER DEFAULT 0,
  training_wrong_answers INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'started';
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS lines_cleared INTEGER DEFAULT 0;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS best_combo INTEGER DEFAULT 0;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS training_correct_answers INTEGER DEFAULT 0;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS training_wrong_answers INTEGER DEFAULT 0;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE aurum_blocks_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS aurum_blocks_scores (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  lines_cleared INTEGER DEFAULT 0,
  best_combo INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_blocks_training_questions (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  category TEXT DEFAULT 'carature',
  difficulty TEXT DEFAULT 'base',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_blocks_badges (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  condition JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aurum_blocks_user_badges (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  badge_id BIGINT NOT NULL,
  session_id BIGINT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_aurum_blocks_scores_user_id ON aurum_blocks_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_scores_store_id ON aurum_blocks_scores(store_id);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_scores_mode ON aurum_blocks_scores(mode);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_scores_score ON aurum_blocks_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_scores_created_at ON aurum_blocks_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_sessions_user_id ON aurum_blocks_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_sessions_store_id ON aurum_blocks_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_sessions_status ON aurum_blocks_sessions(status);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_questions_active ON aurum_blocks_training_questions(active);
CREATE INDEX IF NOT EXISTS idx_aurum_blocks_user_badges_user_id ON aurum_blocks_user_badges(user_id);

INSERT INTO aurum_blocks_training_questions (question, options, correct_answer, explanation, category, difficulty, active)
SELECT 'Il 18kt contiene circa quale percentuale di oro puro?', '["75%", "50%", "90%"]'::jsonb, '75%', '18kt corrisponde a circa 75% di oro puro.', 'carature', 'base', true
WHERE NOT EXISTS (SELECT 1 FROM aurum_blocks_training_questions WHERE question = 'Il 18kt contiene circa quale percentuale di oro puro?');

INSERT INTO aurum_blocks_training_questions (question, options, correct_answer, explanation, category, difficulty, active)
SELECT 'Quale titolo argento è comunemente indicato come sterling?', '["925", "800", "999"]'::jsonb, '925', 'L''argento sterling è comunemente indicato come 925.', 'argento', 'base', true
WHERE NOT EXISTS (SELECT 1 FROM aurum_blocks_training_questions WHERE question = 'Quale titolo argento è comunemente indicato come sterling?');

INSERT INTO aurum_blocks_training_questions (question, options, correct_answer, explanation, category, difficulty, active)
SELECT 'Il 24kt indica oro praticamente puro?', '["Sì", "No"]'::jsonb, 'Sì', '24kt indica oro praticamente puro.', 'carature', 'base', true
WHERE NOT EXISTS (SELECT 1 FROM aurum_blocks_training_questions WHERE question = 'Il 24kt indica oro praticamente puro?');

INSERT INTO aurum_blocks_training_questions (question, options, correct_answer, explanation, category, difficulty, active)
SELECT 'Prima di archiviare un atto cosa va controllato?', '["Documento, firme, pagamento", "Solo il peso", "Solo il nome cliente"]'::jsonb, 'Documento, firme, pagamento', 'Documento, firme e pagamento sono controlli essenziali.', 'procedure', 'intermedio', true
WHERE NOT EXISTS (SELECT 1 FROM aurum_blocks_training_questions WHERE question = 'Prima di archiviare un atto cosa va controllato?');

INSERT INTO aurum_blocks_training_questions (question, options, correct_answer, explanation, category, difficulty, active)
SELECT 'Se un documento è scaduto, cosa deve fare l''operatore?', '["Fermarsi/verificare procedura", "Completare comunque", "Ignorare"]'::jsonb, 'Fermarsi/verificare procedura', 'Un documento scaduto richiede verifica prima di procedere.', 'procedure', 'intermedio', true
WHERE NOT EXISTS (SELECT 1 FROM aurum_blocks_training_questions WHERE question = 'Se un documento è scaduto, cosa deve fare l''operatore?');

INSERT INTO aurum_blocks_badges (code, name, description, condition, active)
VALUES
  ('primo_lingotto', 'Primo Lingotto', 'Prima partita Aurum Blocks completata.', '{"first_game": true}'::jsonb, true),
  ('linea_pulita', 'Linea Pulita', '10 righe completate in una partita.', '{"lines_cleared": 10}'::jsonb, true),
  ('maestro_18kt', 'Maestro 18kt', '5 risposte corrette in Training Carature.', '{"training_correct_answers": 5}'::jsonb, true),
  ('combo_oroactive', 'Combo OroActive', 'Combo 3+ in una partita.', '{"best_combo": 3}'::jsonb, true),
  ('operatore_preciso', 'Operatore Preciso', 'Training Carature con almeno 80% di risposte corrette.', '{"training_accuracy": 80}'::jsonb, true),
  ('aurum_arcade_pro', 'Aurum Arcade Pro', 'Aurum Score superiore a 10.000.', '{"score": 10000}'::jsonb, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    condition = EXCLUDED.condition,
    active = TRUE;
