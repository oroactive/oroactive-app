function jurisdictionScore(candidate, wanted) {
  const actual = String(candidate.jurisdiction || "GLOBAL").toUpperCase();
  if (actual === wanted) return 1;
  if (wanted === "IT" && ["EU", "GLOBAL"].includes(actual)) return 0.75;
  return actual === "GLOBAL" ? 0.5 : 0;
}

export function scoreKnowledgeCandidate(candidate = {}, context = {}) {
  const authority = Math.max(0, Math.min(100, Number(candidate.authority_level || candidate.source?.authority_level || 0))) / 100;
  const semantic = Math.max(0, Number(candidate.semantic_score || 0));
  const lexical = Math.max(0, Number(candidate.lexical_score || 0));
  const domain = !context.domains?.length || context.domains.includes(candidate.domain) ? 1 : 0;
  const jurisdiction = jurisdictionScore(candidate, String(context.jurisdiction || "IT").toUpperCase());
  const procedure = candidate.fact_type === "procedure" || candidate.type === "procedure" ? 0.03 : 0;
  const penalty = candidate.has_conflict ? 0.18 : 0;
  return (semantic * 0.32) + (lexical * 0.2) + (authority * 0.3) + (jurisdiction * 0.1) + (domain * 0.08) + procedure - penalty;
}

export function rerankKnowledgeCandidates(candidates = [], context = {}, limit = 8) {
  return candidates.map((candidate) => ({ ...candidate, retrieval_score: scoreKnowledgeCandidate(candidate, context) }))
    .sort((a, b) => b.retrieval_score - a.retrieval_score || Number(b.authority_level || 0) - Number(a.authority_level || 0))
    .slice(0, limit);
}
