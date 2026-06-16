ALTER TABLE course_quizzes
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS course_quizzes_course_sort_idx
  ON course_quizzes (course_id, sort_order, id);

CREATE INDEX IF NOT EXISTS course_quiz_results_course_user_idx
  ON course_quiz_results (course_id, user_id, created_at DESC);
