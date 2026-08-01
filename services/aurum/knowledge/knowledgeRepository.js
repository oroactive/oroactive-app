function words(value = "") {
  return String(value).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
}

function lexicalScore(query, candidate) {
  const wanted = new Set(words(query));
  if (!wanted.size) return 0;
  const haystack = new Set(words(`${candidate.title || ""} ${candidate.content || ""}`));
  return [...wanted].filter((word) => haystack.has(word)).length / wanted.size;
}

export class InMemoryKnowledgeRepository {
  constructor(records = {}) {
    this.chunks = [...(records.chunks || [])];
    this.facts = [...(records.facts || [])];
    this.relations = [...(records.relations || [])];
    this.procedures = [...(records.procedures || [])];
    this.cases = [...(records.cases || [])];
  }

  async searchFullText(query, options = {}) {
    return this.chunks.map((item) => ({ ...item, lexical_score: lexicalScore(query, item) }))
      .filter((item) => item.lexical_score > 0).sort((a, b) => b.lexical_score - a.lexical_score).slice(0, options.limit || 40);
  }

  async listEmbeddingCandidates(options = {}) {
    return this.chunks.filter((item) => Array.isArray(item.embedding)).slice(0, options.limit || 500);
  }

  async searchGraph(query, options = {}) {
    const wanted = new Set(words(query));
    return [...this.facts, ...this.relations].filter((item) => words(`${item.subject || item.source_entity || ""} ${item.predicate || item.relation_type || ""} ${item.object ?? item.object_value ?? item.target_entity ?? ""}`).some((word) => wanted.has(word)))
      .slice(0, options.limit || 30);
  }

  async searchProcedures(query, options = {}) {
    return this.procedures.map((item) => ({ ...item, lexical_score: lexicalScore(query, item) }))
      .filter((item) => item.lexical_score > 0).sort((a, b) => b.lexical_score - a.lexical_score).slice(0, options.limit || 10);
  }

  async searchCases(query, options = {}) {
    return this.cases.map((item) => ({ ...item, lexical_score: lexicalScore(query, item) }))
      .filter((item) => item.lexical_score > 0).sort((a, b) => b.lexical_score - a.lexical_score).slice(0, options.limit || 10);
  }
}

export function createSqlKnowledgeRepository({ query } = {}) {
  if (typeof query !== "function") throw new Error("Adapter SQL: funzione query obbligatoria.");
  function governanceParameters(options = {}) {
    return [
      String(options.jurisdiction || "IT").toUpperCase(),
      Array.isArray(options.domains) && options.domains.length ? options.domains : null,
      Number(options.minimumAuthorityLevel || 0),
      options.asOf || new Date().toISOString(),
      String(options.role || "aiuto_commesso")
    ];
  }
  const governedChunkWhere = `c.review_status = 'approved'
      AND v.review_status = 'approved' AND v.is_current = TRUE
      AND s.active = TRUE
      AND COALESCE(c.jurisdiction, s.jurisdiction, 'GLOBAL') = ANY(CASE WHEN $2 = 'IT' THEN ARRAY['IT','EU','GLOBAL']::text[] ELSE ARRAY[$2,'GLOBAL']::text[] END)
      AND ($3::text[] IS NULL OR c.domain = ANY($3::text[]))
      AND COALESCE(c.authority_level, s.authority_level, 0) >= $4
      AND (COALESCE(c.valid_from, v.effective_from) IS NULL OR COALESCE(c.valid_from, v.effective_from) <= $5::date)
      AND (COALESCE(c.valid_to, v.effective_to) IS NULL OR COALESCE(c.valid_to, v.effective_to) >= $5::date)`;
  return Object.freeze({
    async searchFullText(text, options = {}) {
      const limit = Number(options.limit || 40);
      const result = await query(`SELECT c.*, s.source_key, s.organization, s.title AS source_title, s.official_url, s.active AS source_active,
          v.version_label, v.effective_from, v.effective_to, v.retrieved_at, v.is_current,
          ts_rank(c.content_tsv, plainto_tsquery('italian', $1)) AS lexical_score
        FROM ai_document_chunks c
        JOIN ai_source_versions v ON v.id = c.source_version_id
        JOIN ai_source_registry s ON s.id = v.source_id
        WHERE c.content_tsv @@ plainto_tsquery('italian', $1) AND ${governedChunkWhere}
        ORDER BY lexical_score DESC, COALESCE(c.authority_level, s.authority_level) DESC LIMIT $7`, [text, ...governanceParameters(options), limit]);
      return result.rows || result;
    },
    async listEmbeddingCandidates(options = {}) {
      const limit = Number(options.limit || 500);
      const result = await query(`SELECT c.*, c.embedding_json AS embedding, s.source_key, s.organization, s.title AS source_title,
          s.official_url, s.active AS source_active, v.version_label, v.effective_from, v.effective_to, v.retrieved_at, v.is_current
        FROM ai_document_chunks c
        JOIN ai_source_versions v ON v.id = c.source_version_id
        JOIN ai_source_registry s ON s.id = v.source_id
        WHERE c.embedding_json IS NOT NULL AND ${governedChunkWhere}
        ORDER BY COALESCE(c.authority_level, s.authority_level) DESC LIMIT $7`, ["", ...governanceParameters(options), limit]);
      return result.rows || result;
    },
    async searchGraph(text, options = {}) {
      const terms = words(text).slice(0, 8);
      if (!terms.length) return [];
      const params = governanceParameters(options);
      const limit = Number(options.limit || 30);
      const result = await query(`SELECT f.*, f.object_value AS object, v.is_current, s.source_key, s.organization, s.title AS source_title,
          s.official_url, s.active AS source_active
        FROM ai_knowledge_facts f
        JOIN ai_source_versions v ON v.id = f.source_version_id
        JOIN ai_source_registry s ON s.id = v.source_id
        WHERE EXISTS (
            SELECT 1 FROM unnest($1::text[]) term
            WHERE f.subject ILIKE '%' || term || '%'
               OR f.predicate ILIKE '%' || term || '%'
               OR f.object_value::text ILIKE '%' || term || '%'
          )
          AND f.review_status = 'approved' AND v.review_status = 'approved' AND v.is_current = TRUE AND s.active = TRUE
          AND COALESCE(f.jurisdiction, s.jurisdiction, 'GLOBAL') = ANY(CASE WHEN $2 = 'IT' THEN ARRAY['IT','EU','GLOBAL']::text[] ELSE ARRAY[$2,'GLOBAL']::text[] END)
          AND ($3::text[] IS NULL OR f.domain = ANY($3::text[])) AND f.authority_level >= $4
          AND (f.valid_from IS NULL OR f.valid_from <= $5::date) AND (f.valid_to IS NULL OR f.valid_to >= $5::date)
        ORDER BY f.authority_level DESC LIMIT $7`, [terms, ...params, limit]);
      return result.rows || result;
    },
    async searchProcedures(text, options = {}) {
      const limit = Number(options.limit || 10);
      const result = await query(`SELECT p.*, 'procedure' AS fact_type, TRUE AS is_current, 85 AS authority_level,
          string_agg(ps.instruction, E'\\n' ORDER BY ps.step_order) AS content
        FROM ai_procedures p LEFT JOIN ai_procedure_steps ps ON ps.procedure_id = p.id
        WHERE (p.title ILIKE $1 OR p.purpose ILIKE $1 OR ps.instruction ILIKE $1)
          AND p.active = TRUE AND p.review_status = 'approved'
          AND COALESCE(p.jurisdiction, 'GLOBAL') = ANY(CASE WHEN $2 = 'IT' THEN ARRAY['IT','EU','GLOBAL']::text[] ELSE ARRAY[$2,'GLOBAL']::text[] END)
          AND ($3::text[] IS NULL OR p.domain = ANY($3::text[]))
          AND ($6 = 'founder' OR p.required_role IS NULL OR p.required_role = $6)
        GROUP BY p.id ORDER BY p.version DESC LIMIT $7`, [`%${text}%`, ...governanceParameters(options), limit]);
      return result.rows || result;
    },
    async searchCases(text, options = {}) {
      const limit = Number(options.limit || 10);
      const params = governanceParameters(options);
      const result = await query(`SELECT c.id, c.title,
          CONCAT_WS(E'\n', c.summary, c.initial_error, c.correct_decision, c.final_outcome, c.lesson_learned, c.facts::text, c.tests_performed::text) AS content,
          c.domain, COALESCE(s.jurisdiction, 'IT') AS jurisdiction, s.authority_level,
          c.review_status, TRUE AS is_current, s.active AS source_active,
          s.source_key, s.organization,
          c.title AS source_title, s.official_url,
          c.approved_at AS effective_from, NULL::timestamptz AS effective_to,
          c.approved_at AS retrieved_at, 'case'::text AS fact_type,
          ts_rank(
            to_tsvector('italian', CONCAT_WS(' ', c.title, c.summary, c.initial_error, c.correct_decision, c.final_outcome, c.lesson_learned, c.facts::text, c.tests_performed::text)),
            plainto_tsquery('italian', $1)
          ) AS lexical_score
        FROM ai_case_library c
        JOIN ai_source_registry s ON s.source_key = 'oroactive-casi-approvati'
        WHERE c.anonymized = TRUE AND c.review_status = 'approved' AND s.active = TRUE
          AND to_tsvector('italian', CONCAT_WS(' ', c.title, c.summary, c.initial_error, c.correct_decision, c.final_outcome, c.lesson_learned, c.facts::text, c.tests_performed::text))
              @@ plainto_tsquery('italian', $1)
          AND ($3::text[] IS NULL OR c.domain = ANY($3::text[]))
        ORDER BY lexical_score DESC, c.approved_at DESC NULLS LAST
        LIMIT $7`, [text, ...params, limit]);
      return result.rows || result;
    }
  });
}
