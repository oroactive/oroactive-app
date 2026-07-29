BEGIN;

ALTER TABLE academy_gem_materials
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS mineral_name TEXT,
  ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS group_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS history TEXT,
  ADD COLUMN IF NOT EXISTS origins JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS typical_uses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS typical_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mohs_min NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS mohs_max NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS density_min NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS density_max NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS refractive_index_min NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS refractive_index_max NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS optical_character TEXT,
  ADD COLUMN IF NOT EXISTS fluorescence_long_wave TEXT,
  ADD COLUMN IF NOT EXISTS fluorescence_short_wave TEXT,
  ADD COLUMN IF NOT EXISTS phosphorescence TEXT,
  ADD COLUMN IF NOT EXISTS cleaning_precautions TEXT,
  ADD COLUMN IF NOT EXISTS common_treatments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS common_simulants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS value_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_value_level TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'Avanzata',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS founder_review_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS founder_reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS founder_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS media_status TEXT NOT NULL DEFAULT 'needs_media',
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE academy_gem_materials
SET name = COALESCE(name, commercial_name),
    mineral_name = COALESCE(mineral_name, mineralogical_name),
    group_name = COALESCE(group_name, gem_group),
    summary = COALESCE(summary, theory),
    description = COALESCE(description, theory),
    origins = CASE
      WHEN jsonb_array_length(origins) = 0 AND origin IS NOT NULL THEN jsonb_build_array(origin)
      ELSE origins
    END,
    review_status = CASE WHEN published THEN 'approved' ELSE review_status END,
    media_status = CASE WHEN published THEN 'needs_review' ELSE media_status END
WHERE name IS NULL
   OR mineral_name IS NULL
   OR summary IS NULL
   OR description IS NULL;

CREATE TABLE IF NOT EXISTS academy_gem_media (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT,
  observation_notes TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  medium_url TEXT,
  large_url TEXT,
  source TEXT NOT NULL,
  author TEXT,
  license TEXT NOT NULL,
  rights_status TEXT NOT NULL DEFAULT 'pending',
  original_width INTEGER,
  original_height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE academy_gem_media
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE academy_gem_media
  DROP CONSTRAINT IF EXISTS academy_gem_media_view_count_check;

ALTER TABLE academy_gem_media
  ADD CONSTRAINT academy_gem_media_view_count_check CHECK (view_count BETWEEN 1 AND 12);

CREATE TABLE IF NOT EXISTS academy_gem_material_tools (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  tool_id BIGINT NOT NULL REFERENCES academy_gem_tools(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'consigliato',
  purpose TEXT,
  preparation TEXT,
  procedure TEXT,
  expected_observation TEXT,
  interpretation TEXT,
  limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk TEXT,
  do_not_use_when TEXT,
  next_step TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(material_id, tool_id)
);

CREATE TABLE IF NOT EXISTS academy_gem_inclusions (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  meaning TEXT,
  occurs_in JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnostic_limit TEXT,
  media_id BIGINT REFERENCES academy_gem_media(id) ON DELETE SET NULL,
  inclusion_type TEXT NOT NULL DEFAULT 'typical',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_gem_comparisons (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  compared_material_id BIGINT REFERENCES academy_gem_materials(id) ON DELETE SET NULL,
  compared_name TEXT NOT NULL,
  comparison_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  discriminating_element TEXT,
  verification_limit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_gem_analysis_protocols (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_gem_analysis_sessions (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT REFERENCES academy_gem_materials(id) ON DELETE SET NULL,
  user_id BIGINT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  store_id BIGINT,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preliminary_conclusion TEXT,
  missing_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  referral_required BOOLEAN NOT NULL DEFAULT FALSE,
  photo_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy_gem_sources (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES academy_gem_materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  url TEXT,
  accessed_on DATE,
  note TEXT,
  reviewer_id BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE academy_gem_materials
SET active = FALSE,
    published = FALSE,
    review_status = 'draft',
    media_status = 'needs_media',
    updated_at = NOW()
WHERE slug = 'diamante-sintetico';

UPDATE academy_gem_materials AS material
SET published = FALSE,
    review_status = CASE WHEN review_status = 'approved' THEN 'draft' ELSE review_status END,
    media_status = CASE
      WHEN (
        SELECT COALESCE(SUM(GREATEST(media.view_count, 1)), 0)
        FROM academy_gem_media AS media
        WHERE media.material_id = material.id
          AND media.active = TRUE
          AND media.rights_status = 'approved'
          AND media.type <> 'video'
          AND GREATEST(
            COALESCE(media.original_width, 0),
            COALESCE(media.original_height, 0)
          ) >= 1000
      ) < 4 THEN 'needs_media'
      ELSE media_status
    END,
    updated_at = NOW()
WHERE published = TRUE
  AND (
    COALESCE(NULLIF(TRIM(material.summary), ''), NULLIF(TRIM(material.theory), '')) IS NULL
    OR COALESCE(material.mohs_min, NULLIF(REGEXP_REPLACE(COALESCE(material.mohs_hardness, ''), '[^0-9.]', '', 'g'), '')::numeric) IS NULL
    OR COALESCE(material.refractive_index_min, NULLIF(REGEXP_REPLACE(COALESCE(material.refractive_index, ''), '[^0-9.]', '', 'g'), '')::numeric) IS NULL
    OR jsonb_array_length(material.common_treatments) = 0
    OR jsonb_array_length(material.common_simulants) = 0
    OR (
        SELECT COALESCE(SUM(GREATEST(media.view_count, 1)), 0)
      FROM academy_gem_media AS media
      WHERE media.material_id = material.id
        AND media.active = TRUE
        AND media.rights_status = 'approved'
        AND media.type <> 'video'
        AND GREATEST(
          COALESCE(media.original_width, 0),
          COALESCE(media.original_height, 0)
        ) >= 1000
    ) < 4
    OR (SELECT COUNT(*) FROM academy_gem_inclusions WHERE material_id = material.id) < 1
    OR (SELECT COUNT(*) FROM academy_gem_material_tools WHERE material_id = material.id) < 3
    OR (SELECT COUNT(*) FROM academy_gem_analysis_protocols WHERE material_id = material.id AND active = TRUE) < 1
    OR (SELECT COUNT(*) FROM academy_gem_comparisons WHERE material_id = material.id) < 1
    OR (SELECT COUNT(*) FROM academy_gem_sources WHERE material_id = material.id) < 1
  );

CREATE INDEX IF NOT EXISTS academy_gem_materials_catalog_idx
  ON academy_gem_materials(active, published, category, classification, name);
CREATE INDEX IF NOT EXISTS academy_gem_media_material_idx
  ON academy_gem_media(material_id, active, sort_order);
CREATE INDEX IF NOT EXISTS academy_gem_material_tools_material_idx
  ON academy_gem_material_tools(material_id, sort_order);
CREATE INDEX IF NOT EXISTS academy_gem_inclusions_material_idx
  ON academy_gem_inclusions(material_id, inclusion_type);
CREATE INDEX IF NOT EXISTS academy_gem_comparisons_material_idx
  ON academy_gem_comparisons(material_id, sort_order);
CREATE INDEX IF NOT EXISTS academy_gem_protocols_material_idx
  ON academy_gem_analysis_protocols(material_id, active);
CREATE INDEX IF NOT EXISTS academy_gem_sessions_user_idx
  ON academy_gem_analysis_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS academy_gem_sources_material_idx
  ON academy_gem_sources(material_id);

COMMIT;
