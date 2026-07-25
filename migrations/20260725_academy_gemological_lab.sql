CREATE TABLE IF NOT EXISTS academy_gem_tools (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  usage TEXT NOT NULL,
  limitations TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_gem_materials (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  commercial_name TEXT NOT NULL,
  mineralogical_name TEXT NOT NULL,
  family TEXT,
  gem_group TEXT,
  chemical_formula TEXT,
  crystal_system TEXT,
  origin TEXT,
  classification TEXT NOT NULL,
  theory TEXT,
  mohs_hardness TEXT,
  density TEXT,
  specific_gravity TEXT,
  tenacity TEXT,
  cleavage TEXT,
  fracture TEXT,
  luster TEXT,
  transparency TEXT,
  color TEXT,
  pleochroism TEXT,
  refractive_index TEXT,
  birefringence TEXT,
  dispersion TEXT,
  double_refraction TEXT,
  fluorescence TEXT,
  spectral_features TEXT,
  optical_properties JSONB DEFAULT '[]'::jsonb,
  inclusions JSONB DEFAULT '{}'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  identification_difficulty INTEGER NOT NULL DEFAULT 1 CHECK (identification_difficulty BETWEEN 1 AND 5),
  operator_protocol JSONB DEFAULT '{}'::jsonb,
  recommended_tools JSONB DEFAULT '[]'::jsonb,
  common_mistakes JSONB DEFAULT '[]'::jsonb,
  comparison_table JSONB DEFAULT '{}'::jsonb,
  quiz JSONB DEFAULT '{}'::jsonb,
  published BOOLEAN DEFAULT FALSE,
  founder_review_status TEXT NOT NULL DEFAULT 'pending' CHECK (founder_review_status IN ('pending', 'approved', 'rejected')),
  founder_reviewed_at TIMESTAMPTZ,
  founder_reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_gem_quiz_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'recognition',
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  level_reached INTEGER NOT NULL DEFAULT 1 CHECK (level_reached BETWEEN 1 AND 5),
  answers JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS academy_gem_materials_public_idx
  ON academy_gem_materials(published, founder_review_status, commercial_name);
CREATE INDEX IF NOT EXISTS academy_gem_quiz_attempts_user_idx
  ON academy_gem_quiz_attempts(user_id, completed_at DESC);
