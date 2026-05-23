CREATE TABLE IF NOT EXISTS ai_knowledge_notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  source TEXT,
  author_id BIGINT,
  author_role TEXT,
  status TEXT DEFAULT 'in revisione',
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS author_id BIGINT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS author_role TEXT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in revisione';
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS approved_by BIGINT;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ai_knowledge_notes_status_idx
  ON ai_knowledge_notes (status);

CREATE INDEX IF NOT EXISTS ai_knowledge_notes_author_idx
  ON ai_knowledge_notes (author_id);

CREATE INDEX IF NOT EXISTS ai_knowledge_notes_category_idx
  ON ai_knowledge_notes (category);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  question TEXT,
  answer TEXT,
  feedback_type TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS answer TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ai_feedback_user_idx
  ON ai_feedback (user_id);

CREATE INDEX IF NOT EXISTS ai_feedback_type_idx
  ON ai_feedback (feedback_type);
