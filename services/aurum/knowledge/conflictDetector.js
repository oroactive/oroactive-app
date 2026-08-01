function factKey(fact) {
  return `${String(fact.subject || "").trim().toLowerCase()}|${String(fact.predicate || "").trim().toLowerCase()}`;
}

export function detectKnowledgeConflicts(facts = [], options = {}) {
  const groups = new Map();
  for (const fact of facts) {
    const key = factKey(fact);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fact);
  }
  const conflicts = [];
  for (const [key, items] of groups) {
    const values = new Set(items.map((item) => JSON.stringify(item.object ?? item.object_value)));
    if (values.size < 2) continue;
    const ranked = [...items].sort((a, b) => Number(b.authority_level || 0) - Number(a.authority_level || 0));
    const tied = Number(ranked[0].authority_level || 0) === Number(ranked[1].authority_level || 0);
    conflicts.push(Object.freeze({
      key,
      winner: tied ? null : ranked[0],
      alternatives: ranked,
      status: tied || options.riskLevel === "high" || options.riskLevel === "critical" ? "manual_review_required" : "resolved_by_authority",
      rationale: tied ? "Fonti di pari autorità in contrasto." : "Prevale la fonte con maggiore autorità; il contrasto resta tracciato."
    }));
  }
  return conflicts;
}
