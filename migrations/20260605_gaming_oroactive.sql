CREATE TABLE IF NOT EXISTS gaming_sections (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gaming_user_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  game_type TEXT NOT NULL,
  best_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  level_reached INTEGER DEFAULT 1,
  sessions_played INTEGER DEFAULT 0,
  total_play_time INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ NULL,
  rewards_unlocked JSONB DEFAULT '[]'::jsonb,
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

CREATE TABLE IF NOT EXISTS gaming_aurum_blocks_scores (
  id BIGSERIAL PRIMARY KEY,
  source_score_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level INTEGER DEFAULT 1,
  lines_cleared INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'arcade',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS gaming_gold_run_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  store_id BIGINT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level_reached INTEGER DEFAULT 1,
  duration_seconds INTEGER DEFAULT 0,
  rewards_collected INTEGER DEFAULT 0,
  bosses_defeated INTEGER DEFAULT 0,
  character_name TEXT DEFAULT 'Elite',
  mode TEXT DEFAULT 'arcade',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS gaming_daily_challenges (
  id BIGSERIAL PRIMARY KEY,
  game_type TEXT NOT NULL,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  seed TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_type, challenge_date)
);

CREATE TABLE IF NOT EXISTS gaming_rewards (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  game_type TEXT,
  points INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gaming_badges (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT,
  condition JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gaming_achievements (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT DEFAULT 'gold_run',
  condition JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gaming_progress_user_id ON gaming_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_progress_store_id ON gaming_user_progress(store_id);
CREATE INDEX IF NOT EXISTS idx_gaming_progress_game_type ON gaming_user_progress(game_type);
CREATE INDEX IF NOT EXISTS idx_gaming_gold_run_scores_user_id ON gaming_gold_run_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_gold_run_scores_store_id ON gaming_gold_run_scores(store_id);
CREATE INDEX IF NOT EXISTS idx_gaming_gold_run_scores_score ON gaming_gold_run_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_gaming_gold_run_scores_created_at ON gaming_gold_run_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gaming_aurum_blocks_scores_user_id ON gaming_aurum_blocks_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_daily_challenges_date ON gaming_daily_challenges(challenge_date DESC);

INSERT INTO gaming_sections (code, name, description, active)
VALUES
  ('aurum_blocks', 'Aurum Blocks', 'Arcade formativo con lingotti, metalli e carature.', true),
  ('gold_run', 'La corsa all''oro', 'Platform arcade OroActive con Elite, premi e boss originali.', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    updated_at = NOW();

INSERT INTO gaming_achievements (code, name, description, game_type, condition, active)
VALUES
  ('primo_lingotto', 'Primo lingotto', 'Prima raccolta nella Corsa all''oro.', 'gold_run', '{"rewards_collected": 1}'::jsonb, true),
  ('re_24kt', 'Re del 24kt', 'Raccogli 5 lingotti 24kt in una partita.', 'gold_run', '{"reward": "oro24", "count": 5}'::jsonb, true),
  ('cacciatore_diamanti', 'Cacciatore di diamanti', 'Raccogli 3 diamanti certificati.', 'gold_run', '{"reward": "diamond", "count": 3}'::jsonb, true),
  ('dieci_livelli', '10 livelli completati', 'Completa la Fortezza dell''Oro.', 'gold_run', '{"level_reached": 10}'::jsonb, true),
  ('boss_hunter', 'Boss Hunter', 'Sconfiggi almeno un boss.', 'gold_run', '{"bosses_defeated": 1}'::jsonb, true),
  ('record_personale', 'Record personale', 'Supera il miglior punteggio personale.', 'gold_run', '{"personal_record": true}'::jsonb, true),
  ('maestro_oroactive_arcade', 'Maestro OroActive Arcade', 'Supera 25.000 punti.', 'gold_run', '{"score": 25000}'::jsonb, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    game_type = EXCLUDED.game_type,
    condition = EXCLUDED.condition,
    active = EXCLUDED.active,
    updated_at = NOW();
