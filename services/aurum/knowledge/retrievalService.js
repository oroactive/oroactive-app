import { cosineSimilarity } from "./embeddingService.js";
import { rerankKnowledgeCandidates } from "./reranker.js";

function isoTime(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function candidateIsEligible(candidate = {}, context = {}) {
  const asOf = new Date(context.asOf || Date.now()).getTime();
  if (candidate.review_status !== "approved" || candidate.is_current !== true) return false;
  if (candidate.source_active === false || candidate.source?.active === false || candidate.stale === true) return false;
  const from = isoTime(candidate.valid_from || candidate.effective_from);
  const to = isoTime(candidate.valid_to || candidate.effective_to);
  if ((from && from > asOf) || (to && to < asOf)) return false;
  const jurisdiction = String(candidate.jurisdiction || "GLOBAL").toUpperCase();
  const wanted = String(context.jurisdiction || "IT").toUpperCase();
  if (![wanted, "GLOBAL", ...(wanted === "IT" ? ["EU"] : [])].includes(jurisdiction)) return false;
  if (Array.isArray(candidate.authorized_roles) && candidate.authorized_roles.length && !candidate.authorized_roles.includes(context.role)) return false;
  if (context.domains?.length && candidate.domain && !context.domains.includes(candidate.domain)) return false;
  const minimumAuthority = candidate.fact_type === "case" || candidate.type === "case"
    ? 70
    : Number(context.minimumAuthorityLevel || 0);
  return Number(candidate.authority_level || candidate.source?.authority_level || 0) >= minimumAuthority;
}

function keyOf(item) {
  const kind = item.fact_type || item.type || (item.chunk_id ? "chunk" : item.fact_id ? "fact" : "knowledge");
  const identifier = item.id || item.chunk_id || item.fact_id;
  return identifier
    ? `${kind}:${identifier}`
    : `${kind}:${item.source_key || "source"}:${item.section_path || item.subject || item.content}`;
}

export function createRetrievalService({ repository, embeddingService, rerank = rerankKnowledgeCandidates } = {}) {
  if (!repository) throw new Error("Knowledge repository obbligatorio.");
  return Object.freeze({
    async retrieve(query, context = {}) {
      const [fts, graph, procedures, cases] = await Promise.all([
        repository.searchFullText?.(query, { limit: 60, ...context }) || [],
        repository.searchGraph?.(query, { limit: 30, ...context }) || [],
        repository.searchProcedures?.(query, { limit: 10, ...context }) || [],
        repository.searchCases?.(query, { limit: 10, ...context }) || []
      ]);
      let semantic = [];
      if (repository.searchSemantic) {
        semantic = await repository.searchSemantic(query, { limit: 40, ...context });
      } else if (embeddingService && repository.listEmbeddingCandidates) {
        const vector = await embeddingService.embed(query);
        semantic = (await repository.listEmbeddingCandidates({ limit: 500, ...context }))
          .map((item) => ({ ...item, semantic_score: cosineSimilarity(vector, item.embedding || []) }))
          .filter((item) => item.semantic_score > 0).sort((a, b) => b.semantic_score - a.semantic_score).slice(0, 40);
      }
      const merged = new Map();
      for (const candidate of [...fts, ...semantic, ...graph, ...procedures, ...cases]) {
        const key = keyOf(candidate);
        const existing = merged.get(key) || {};
        merged.set(key, { ...existing, ...candidate, lexical_score: Math.max(existing.lexical_score || 0, candidate.lexical_score || 0), semantic_score: Math.max(existing.semantic_score || 0, candidate.semantic_score || 0) });
      }
      const eligible = [...merged.values()].filter((candidate) => candidateIsEligible(candidate, context));
      const preliminary = rerank(eligible, context, 12);
      const final = rerank(preliminary, context, 8);
      let proceduresUsed = 0;
      return final.filter((item) => {
        const isProcedure = item.fact_type === "procedure" || item.type === "procedure";
        if (!isProcedure) return true;
        proceduresUsed += 1;
        return proceduresUsed <= 2;
      });
    }
  });
}
