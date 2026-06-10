ALTER TABLE courses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE academy_modules ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS academy_source_documents (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  file_path TEXT,
  content_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS academy_source_documents_hash_idx
  ON academy_source_documents (content_hash)
  WHERE content_hash IS NOT NULL AND content_hash <> '';

CREATE TABLE IF NOT EXISTS academy_lesson_source_refs (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  source_document_id BIGINT NOT NULL REFERENCES academy_source_documents(id) ON DELETE CASCADE,
  chapter TEXT,
  page_start INTEGER,
  page_end INTEGER,
  excerpt TEXT,
  confidence NUMERIC(5,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS academy_lesson_source_refs_lesson_idx
  ON academy_lesson_source_refs (lesson_id);
