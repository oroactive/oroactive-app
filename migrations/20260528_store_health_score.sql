CREATE TABLE IF NOT EXISTS store_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  factors JSONB DEFAULT '{}'::jsonb,
  penalties JSONB DEFAULT '[]'::jsonb,
  bonuses JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, date_from, date_to)
);

ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'critico';
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS date_from DATE;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS date_to DATE;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS factors JSONB DEFAULT '{}'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS penalties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS bonuses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE store_health_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_store_health_scores_store_id ON store_health_scores(store_id);
CREATE INDEX IF NOT EXISTS idx_store_health_scores_date ON store_health_scores(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_store_health_scores_score ON store_health_scores(score);
CREATE UNIQUE INDEX IF NOT EXISTS store_health_scores_store_date_unique
  ON store_health_scores (store_id, date_from, date_to);

ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS store_health_data JSONB DEFAULT '{}'::jsonb;
