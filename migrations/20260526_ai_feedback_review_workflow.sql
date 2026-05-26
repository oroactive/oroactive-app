ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'da_valutare';
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS knowledge_note_id BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS reviewed_by BIGINT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE ai_feedback
SET status = 'da_valutare'
WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS ai_feedback_status_idx
  ON ai_feedback (status);
