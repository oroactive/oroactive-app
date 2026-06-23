-- OroActive Academy qualification system
-- Idempotent migration: extends the existing Academy without deleting legacy data.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'base';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_advanced BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS version_label TEXT DEFAULT 'v1';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS version_status TEXT DEFAULT 'published';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS material_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS courses_course_code_unique
  ON courses (course_code)
  WHERE course_code IS NOT NULL AND course_code <> '';

CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_unique
  ON courses (slug)
  WHERE slug IS NOT NULL AND slug <> '';

CREATE TABLE IF NOT EXISTS academy_qualification_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB DEFAULT '{}'::jsonb,
  updated_by BIGINT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_course_prerequisites (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completion_rule TEXT NOT NULL DEFAULT 'course_completed',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS academy_learning_paths (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  target_role TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_learning_path_courses (
  id BIGSERIAL PRIMARY KEY,
  learning_path_id BIGINT NOT NULL REFERENCES academy_learning_paths(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  mandatory BOOLEAN DEFAULT TRUE,
  prerequisite_course_id BIGINT NULL REFERENCES courses(id) ON DELETE SET NULL,
  practical_required BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(learning_path_id, course_id)
);

CREATE TABLE IF NOT EXISTS academy_user_learning_paths (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  learning_path_id BIGINT NOT NULL REFERENCES academy_learning_paths(id) ON DELETE CASCADE,
  assigned_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  target_role TEXT NULL,
  status TEXT DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ NULL,
  UNIQUE(user_id, learning_path_id)
);

CREATE TABLE IF NOT EXISTS academy_competencies (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sensitive BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_course_competencies (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  competency_id BIGINT NOT NULL REFERENCES academy_competencies(id) ON DELETE CASCADE,
  theory_required BOOLEAN DEFAULT TRUE,
  practical_required BOOLEAN DEFAULT FALSE,
  certification_required BOOLEAN DEFAULT TRUE,
  UNIQUE(course_id, competency_id)
);

CREATE TABLE IF NOT EXISTS academy_user_competencies (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  competency_id BIGINT NOT NULL REFERENCES academy_competencies(id) ON DELETE CASCADE,
  learning_state TEXT DEFAULT 'not_started',
  operational_status TEXT DEFAULT 'not_enabled',
  certification_id BIGINT NULL,
  practical_attempt_id BIGINT NULL,
  expires_at TIMESTAMPTZ NULL,
  suspended_at TIMESTAMPTZ NULL,
  suspension_reason TEXT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, competency_id)
);

CREATE TABLE IF NOT EXISTS academy_practical_assessments (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 80,
  requires_human_approval BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_practical_rubric_items (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES academy_practical_assessments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL,
  critical_failure BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(assessment_id, code)
);

CREATE TABLE IF NOT EXISTS academy_practical_attempts (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES academy_practical_assessments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  evaluator_id BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  scenario_id BIGINT NULL,
  status TEXT DEFAULT 'scheduled',
  total_score INTEGER NULL,
  passed BOOLEAN DEFAULT FALSE,
  critical_failure BOOLEAN DEFAULT FALSE,
  candidate_notes TEXT NULL,
  evaluator_notes TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  submitted_at TIMESTAMPTZ NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_practical_scores (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES academy_practical_attempts(id) ON DELETE CASCADE,
  rubric_item_id BIGINT NOT NULL REFERENCES academy_practical_rubric_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  notes TEXT NULL,
  UNIQUE(attempt_id, rubric_item_id)
);

CREATE TABLE IF NOT EXISTS academy_operational_capabilities (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sensitive BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS academy_capability_requirements (
  id BIGSERIAL PRIMARY KEY,
  capability_id BIGINT NOT NULL REFERENCES academy_operational_capabilities(id) ON DELETE CASCADE,
  competency_id BIGINT NULL REFERENCES academy_competencies(id) ON DELETE SET NULL,
  required_role TEXT NULL,
  certification_required BOOLEAN DEFAULT FALSE,
  practical_required BOOLEAN DEFAULT FALSE,
  manager_approval_required BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS academy_user_operational_approvals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  capability_id BIGINT NOT NULL REFERENCES academy_operational_capabilities(id) ON DELETE CASCADE,
  store_id BIGINT NULL,
  status TEXT DEFAULT 'pending',
  approved_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  reason TEXT NULL,
  revoked_by BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_simulation_scenarios (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'base',
  target_roles JSONB DEFAULT '[]'::jsonb,
  scenario_data JSONB NOT NULL,
  expected_controls JSONB NOT NULL,
  expected_decision TEXT NOT NULL,
  expected_escalation TEXT NULL,
  scoring_config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_simulation_attempts (
  id BIGSERIAL PRIMARY KEY,
  scenario_id BIGINT NOT NULL REFERENCES academy_simulation_scenarios(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'training',
  status TEXT DEFAULT 'started',
  decision TEXT NULL,
  controls_executed JSONB DEFAULT '[]'::jsonb,
  documentation JSONB DEFAULT '{}'::jsonb,
  economic_calculation JSONB DEFAULT '{}'::jsonb,
  escalation TEXT NULL,
  score INTEGER NULL,
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS academy_simulation_events (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES academy_simulation_attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_course_versions (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  pdf_material_id BIGINT NULL,
  content_hash TEXT NULL,
  change_log TEXT,
  author_id BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  reviewer_id BIGINT NULL REFERENCES utenti(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NULL,
  valid_from TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, version_number)
);

CREATE TABLE IF NOT EXISTS academy_course_version_acceptances (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  course_version_id BIGINT NOT NULL REFERENCES academy_course_versions(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, course_version_id)
);

CREATE TABLE IF NOT EXISTS academy_recertification_rules (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  validity_days INTEGER NULL,
  renew_on_major_version BOOLEAN DEFAULT FALSE,
  renewal_exam_required BOOLEAN DEFAULT TRUE,
  reminder_days JSONB DEFAULT '[60,30,7]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(course_id)
);

CREATE TABLE IF NOT EXISTS academy_exam_attempts (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'started',
  question_snapshot JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NULL,
  score NUMERIC(6,2) DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS academy_exam_attempt_answers (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES academy_exam_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS academy_prereq_course_idx ON academy_course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS academy_learning_path_courses_path_idx ON academy_learning_path_courses(learning_path_id, sort_order);
CREATE INDEX IF NOT EXISTS academy_user_learning_paths_user_idx ON academy_user_learning_paths(user_id);
CREATE INDEX IF NOT EXISTS academy_user_competencies_user_idx ON academy_user_competencies(user_id);
CREATE INDEX IF NOT EXISTS academy_practical_attempts_user_idx ON academy_practical_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS academy_simulation_attempts_user_idx ON academy_simulation_attempts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS academy_exam_attempts_user_idx ON academy_exam_attempts(user_id, started_at DESC);
