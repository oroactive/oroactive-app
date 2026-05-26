ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS uploaded_by BIGINT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS academy_modules_module_course_idx ON academy_modules (academy_course_id, course_id);
CREATE INDEX IF NOT EXISTS academy_lessons_module_idx ON academy_lessons (academy_module_id);
CREATE INDEX IF NOT EXISTS academy_materials_lesson_idx ON academy_materials (academy_lesson_id);
CREATE INDEX IF NOT EXISTS academy_user_lesson_progress_lesson_idx ON academy_user_lesson_progress (lesson_id, user_id);
CREATE INDEX IF NOT EXISTS academy_user_progress_course_user_idx ON academy_user_progress (course_id, user_id);
CREATE INDEX IF NOT EXISTS academy_exam_results_course_user_idx ON academy_exam_results (course_id, user_id);
