ALTER TABLE courses ADD COLUMN IF NOT EXISTS faculty_id BIGINT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Base';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_label TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS final_certification BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS module_title TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lesson_title TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pdf_url TEXT;

CREATE TABLE IF NOT EXISTS academy_faculties (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_courses (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  faculty_id BIGINT REFERENCES academy_faculties(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'Base',
  duration_minutes INTEGER DEFAULT 0,
  teacher TEXT,
  thumbnail_url TEXT,
  final_certification BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_modules (
  id BIGSERIAL PRIMARY KEY,
  academy_course_id BIGINT REFERENCES academy_courses(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_lessons (
  id BIGSERIAL PRIMARY KEY,
  academy_module_id BIGINT REFERENCES academy_modules(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  pdf_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_materials (
  id BIGSERIAL PRIMARY KEY,
  academy_lesson_id BIGINT REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT,
  material_type TEXT DEFAULT 'link',
  file_url TEXT,
  external_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  uploaded_by BIGINT,
  allow_download BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS uploaded_by BIGINT;
ALTER TABLE academy_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS academy_user_progress (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  status TEXT DEFAULT 'non iniziato',
  percentuale NUMERIC(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS academy_user_lesson_progress (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS academy_exam_results (
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

CREATE TABLE IF NOT EXISTS academy_certificates (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  certificate_code TEXT UNIQUE,
  issued_by BIGINT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS academy_badges (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT,
  badge_name TEXT,
  badge_code TEXT UNIQUE,
  assigned_by BIGINT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'valido'
);

CREATE TABLE IF NOT EXISTS academy_user_notes (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id BIGINT REFERENCES academy_lessons(id) ON DELETE SET NULL,
  user_id BIGINT,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS academy_operator_levels (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE,
  level_name TEXT DEFAULT 'Junior',
  completed_courses INTEGER DEFAULT 0,
  badges_count INTEGER DEFAULT 0,
  certificates_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS courses_faculty_idx ON courses (faculty_id);
CREATE INDEX IF NOT EXISTS academy_courses_course_idx ON academy_courses (course_id);
CREATE INDEX IF NOT EXISTS academy_modules_course_idx ON academy_modules (course_id);
CREATE INDEX IF NOT EXISTS academy_lessons_course_idx ON academy_lessons (course_id);
CREATE INDEX IF NOT EXISTS academy_materials_course_idx ON academy_materials (course_id);
CREATE INDEX IF NOT EXISTS academy_user_progress_user_idx ON academy_user_progress (user_id);
CREATE INDEX IF NOT EXISTS academy_user_lesson_progress_user_idx ON academy_user_lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS academy_certificates_user_idx ON academy_certificates (user_id);
CREATE INDEX IF NOT EXISTS academy_badges_user_idx ON academy_badges (user_id);

INSERT INTO academy_faculties (name, description, sort_order)
VALUES
  ('Facoltà Metalli Preziosi', 'Oro, argento e platino.', 10),
  ('Facoltà Gemmologia', 'Diamanti, pietre preziose e gemme.', 20),
  ('Facoltà Operativa', 'Procedure operative, antiriciclaggio, sicurezza e documentazione.', 30),
  ('Facoltà Business', 'Vendita, coaching aziendale, leadership e gestione negozio.', 40)
ON CONFLICT (name) DO NOTHING;
