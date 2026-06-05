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
  game_type TEXT DEFAULT 'aurum_blocks',
  condition JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gaming_progress_user_id ON gaming_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_progress_store_id ON gaming_user_progress(store_id);
CREATE INDEX IF NOT EXISTS idx_gaming_progress_game_type ON gaming_user_progress(game_type);
CREATE INDEX IF NOT EXISTS idx_gaming_aurum_blocks_scores_user_id ON gaming_aurum_blocks_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_daily_challenges_date ON gaming_daily_challenges(challenge_date DESC);

INSERT INTO gaming_sections (code, name, description, active)
VALUES
  ('aurum_blocks', 'Aurum Blocks', 'Arcade formativo con lingotti, metalli e carature.', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    updated_at = NOW();
