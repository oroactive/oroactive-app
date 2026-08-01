BEGIN;

CREATE TABLE IF NOT EXISTS ai_source_registry (
  id BIGSERIAL PRIMARY KEY,
  source_key TEXT UNIQUE NOT NULL,
  organization TEXT NOT NULL,
  title TEXT NOT NULL,
  official_url TEXT,
  domain TEXT NOT NULL,
  jurisdiction TEXT,
  authority_level INTEGER NOT NULL CHECK (authority_level BETWEEN 0 AND 100),
  source_type TEXT NOT NULL,
  document_identifier TEXT,
  language TEXT DEFAULT 'it',
  license TEXT,
  ingestion_mode TEXT,
  content_policy TEXT DEFAULT 'metadata_abstract_only_until_rights_reviewed',
  allow_full_text BOOLEAN DEFAULT FALSE,
  update_frequency TEXT,
  requires_manual_review BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_source_registry ADD COLUMN IF NOT EXISTS content_policy TEXT DEFAULT 'metadata_abstract_only_until_rights_reviewed';
ALTER TABLE ai_source_registry ADD COLUMN IF NOT EXISTS allow_full_text BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ai_source_registry_domain_active_idx
  ON ai_source_registry (domain, active, authority_level DESC);

CREATE INDEX IF NOT EXISTS ai_source_registry_next_check_idx
  ON ai_source_registry (next_check_at)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS ai_source_versions (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES ai_source_registry(id) ON DELETE CASCADE,
  version_label TEXT,
  publication_date DATE,
  effective_from DATE,
  effective_to DATE,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  content_hash TEXT NOT NULL,
  raw_document_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  change_summary TEXT,
  is_current BOOLEAN DEFAULT TRUE,
  review_status TEXT DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_id, content_hash)
);

CREATE INDEX IF NOT EXISTS ai_source_versions_current_idx
  ON ai_source_versions (source_id, is_current, review_status, effective_from DESC);

ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS source_registry_id BIGINT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS source_version_id BIGINT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS authority_level INTEGER;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS official_url TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE;

DO $$
BEGIN
  ALTER TABLE ai_documents
    ADD CONSTRAINT ai_documents_source_registry_fk
    FOREIGN KEY (source_registry_id) REFERENCES ai_source_registry(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE ai_documents
    ADD CONSTRAINT ai_documents_source_version_fk
    FOREIGN KEY (source_version_id) REFERENCES ai_source_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS ai_documents_source_registry_idx
  ON ai_documents (source_registry_id, source_version_id);

CREATE INDEX IF NOT EXISTS ai_documents_governance_idx
  ON ai_documents (domain, jurisdiction, review_status, is_current, authority_level DESC);

ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS source_version_id BIGINT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS authority_level INTEGER;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS section_path TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS article_number TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS fact_type TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS citation_label TEXT;

DO $$
BEGIN
  ALTER TABLE ai_document_chunks
    ADD CONSTRAINT ai_document_chunks_source_version_fk
    FOREIGN KEY (source_version_id) REFERENCES ai_source_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS ai_document_chunks_governance_idx
  ON ai_document_chunks (domain, jurisdiction, review_status, source_version_id, authority_level DESC);

CREATE TABLE IF NOT EXISTS ai_knowledge_facts (
  id BIGSERIAL PRIMARY KEY,
  fact_key TEXT,
  domain TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_value JSONB NOT NULL,
  jurisdiction TEXT,
  source_version_id BIGINT NOT NULL REFERENCES ai_source_versions(id) ON DELETE RESTRICT,
  chunk_id BIGINT REFERENCES ai_document_chunks(id) ON DELETE SET NULL,
  authority_level INTEGER NOT NULL CHECK (authority_level BETWEEN 0 AND 100),
  valid_from DATE,
  valid_to DATE,
  confidence NUMERIC(5,4),
  review_status TEXT DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_knowledge_facts_version_key_idx
  ON ai_knowledge_facts (fact_key, source_version_id)
  WHERE fact_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_knowledge_facts_retrieval_idx
  ON ai_knowledge_facts (domain, jurisdiction, review_status, authority_level DESC, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS ai_knowledge_relations (
  id BIGSERIAL PRIMARY KEY,
  source_entity TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  domain TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  source_version_id BIGINT REFERENCES ai_source_versions(id) ON DELETE SET NULL,
  review_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_relations_source_idx
  ON ai_knowledge_relations (source_entity, relation_type, review_status);

CREATE INDEX IF NOT EXISTS ai_knowledge_relations_target_idx
  ON ai_knowledge_relations (target_entity, relation_type, review_status);

CREATE TABLE IF NOT EXISTS ai_procedures (
  id BIGSERIAL PRIMARY KEY,
  procedure_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  jurisdiction TEXT,
  purpose TEXT,
  risk_level TEXT,
  required_role TEXT,
  required_tools JSONB DEFAULT '[]'::jsonb,
  preconditions JSONB DEFAULT '[]'::jsonb,
  stop_conditions JSONB DEFAULT '[]'::jsonb,
  escalation_rules JSONB DEFAULT '[]'::jsonb,
  source_versions JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  review_status TEXT DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_procedures_retrieval_idx
  ON ai_procedures (domain, jurisdiction, required_role, active, review_status);

CREATE TABLE IF NOT EXISTS ai_procedure_steps (
  id BIGSERIAL PRIMARY KEY,
  procedure_id BIGINT NOT NULL REFERENCES ai_procedures(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  why_it_matters TEXT,
  input_schema JSONB DEFAULT '{}'::jsonb,
  expected_result JSONB DEFAULT '{}'::jsonb,
  warning TEXT,
  blocking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (procedure_id, step_order)
);

CREATE TABLE IF NOT EXISTS ai_case_library (
  id BIGSERIAL PRIMARY KEY,
  case_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  summary TEXT,
  facts JSONB NOT NULL,
  tests_performed JSONB DEFAULT '[]'::jsonb,
  initial_error TEXT,
  correct_decision TEXT,
  final_outcome TEXT,
  lesson_learned TEXT,
  source_type TEXT,
  anonymized BOOLEAN DEFAULT FALSE,
  review_status TEXT DEFAULT 'pending',
  approved_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_case_library ALTER COLUMN anonymized SET DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ai_case_library_retrieval_idx
  ON ai_case_library (domain, anonymized, review_status, approved_at DESC);

CREATE TABLE IF NOT EXISTS ai_review_queue (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  proposed_change JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  assigned_to BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  resolved_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_review_queue_pending_idx
  ON ai_review_queue (status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES ai_source_registry(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT,
  previous_hash TEXT,
  new_hash TEXT,
  changes_detected BOOLEAN DEFAULT FALSE,
  documents_created INTEGER DEFAULT 0,
  chunks_created INTEGER DEFAULT 0,
  facts_created INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ai_sync_runs_source_idx
  ON ai_sync_runs (source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS ai_answer_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  question_hash TEXT,
  domain TEXT,
  risk_level TEXT,
  sources_used JSONB DEFAULT '[]'::jsonb,
  tools_used JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC(5,4),
  answer_status TEXT,
  escalation_type TEXT,
  processing_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_answer_audit_metrics_idx
  ON ai_answer_audit (created_at DESC, domain, risk_level, answer_status);

CREATE TABLE IF NOT EXISTS ai_evaluation_cases (
  id BIGSERIAL PRIMARY KEY,
  case_key TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  question TEXT NOT NULL,
  expected_source_keys JSONB DEFAULT '[]'::jsonb,
  required_concepts JSONB DEFAULT '[]'::jsonb,
  forbidden_claims JSONB DEFAULT '[]'::jsonb,
  expected_tool TEXT,
  risk_level TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_evaluation_cases_domain_idx
  ON ai_evaluation_cases (domain, active, risk_level);

CREATE TABLE IF NOT EXISTS ai_knowledge_conflicts (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  fact_key TEXT,
  source_version_a_id BIGINT REFERENCES ai_source_versions(id) ON DELETE SET NULL,
  source_version_b_id BIGINT REFERENCES ai_source_versions(id) ON DELETE SET NULL,
  difference JSONB DEFAULT '{}'::jsonb,
  prevailing_authority_level INTEGER,
  impact TEXT,
  recommended_action TEXT,
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  resolved_by BIGINT REFERENCES utenti(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_conflicts_open_idx
  ON ai_knowledge_conflicts (status, risk_level, created_at DESC);

COMMIT;
