ALTER TABLE ai_knowledge_notes ADD COLUMN IF NOT EXISTS store_experience TEXT;

CREATE TABLE IF NOT EXISTS course_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_sections (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES course_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category_id, title)
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES course_categories(id) ON DELETE SET NULL,
  section_id BIGINT REFERENCES course_sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_materials (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT,
  material_type TEXT DEFAULT 'link',
  file_url TEXT,
  allow_download BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_course_progress (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  percentuale NUMERIC(5,2) DEFAULT 0,
  materials_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'non iniziato',
  started_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS course_quizzes (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  question TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_quiz_results (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  score NUMERIC(6,2) DEFAULT 0,
  esito TEXT DEFAULT 'non_superato',
  completed_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_certificates (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  certificate_code TEXT UNIQUE,
  issued_by BIGINT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido',
  revoked_by BIGINT,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS course_badges (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  badge_name TEXT,
  badge_code TEXT UNIQUE,
  assigned_by BIGINT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido'
);

CREATE TABLE IF NOT EXISTS course_exam_sessions (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  exam_type TEXT DEFAULT 'presenza',
  esito TEXT DEFAULT 'non_svolto',
  evaluated_by BIGINT,
  evaluated_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_sections_category_idx ON course_sections (category_id);
CREATE INDEX IF NOT EXISTS courses_category_idx ON courses (category_id);
CREATE INDEX IF NOT EXISTS courses_section_idx ON courses (section_id);
CREATE INDEX IF NOT EXISTS user_course_progress_user_idx ON user_course_progress (user_id);
CREATE INDEX IF NOT EXISTS course_certificates_user_idx ON course_certificates (user_id);
CREATE INDEX IF NOT EXISTS course_badges_user_idx ON course_badges (user_id);
CREATE INDEX IF NOT EXISTS course_exam_sessions_user_idx ON course_exam_sessions (user_id);

INSERT INTO course_categories (name, sort_order)
VALUES
  ('Argento', 10),
  ('Coaching Aziendale', 70),
  ('Diamanti', 40),
  ('Normative', 60),
  ('Oro', 1),
  ('Platino', 30),
  ('Procedure Operative', 50)
ON CONFLICT (name) DO NOTHING;
