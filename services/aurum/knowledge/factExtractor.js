function factError(message) {
  const error = new Error(message);
  error.code = "AURUM_FACT_INVALID";
  return error;
}

function normalizeAtomicString(value, label, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length > maxLength || /\n/.test(String(value || ""))) {
    throw factError(`${label} deve essere atomico e lungo al massimo ${maxLength} caratteri.`);
  }
  return text;
}

function validateObjectValue(value) {
  if (value === undefined) throw factError("object_value obbligatorio.");
  const serialized = JSON.stringify(value);
  if (serialized.length > 1000) throw factError("object_value troppo esteso per un fatto atomico.");
  return value;
}

export function extractStructuredFacts(input = {}, options = {}) {
  if (!Array.isArray(input.facts)) throw factError("facts deve essere un array strutturato.");
  const defaultSourceVersionId = input.sourceVersionId || input.source_version_id;
  const defaultAuthority = Number(input.authorityLevel ?? input.authority_level);
  const facts = input.facts.map((candidate, index) => Object.freeze({
    fact_key: candidate.fact_key || candidate.factKey || null,
    domain: normalizeAtomicString(candidate.domain || input.domain, `facts[${index}].domain`, 80),
    subject: normalizeAtomicString(candidate.subject, `facts[${index}].subject`),
    predicate: normalizeAtomicString(candidate.predicate, `facts[${index}].predicate`, 120),
    object_value: validateObjectValue(candidate.object_value ?? candidate.objectValue),
    jurisdiction: String(candidate.jurisdiction || input.jurisdiction || "GLOBAL").toUpperCase(),
    source_version_id: candidate.source_version_id || candidate.sourceVersionId || defaultSourceVersionId,
    chunk_id: candidate.chunk_id || candidate.chunkId || null,
    authority_level: Number(candidate.authority_level ?? candidate.authorityLevel ?? defaultAuthority),
    valid_from: candidate.valid_from || candidate.validFrom || input.validFrom || null,
    valid_to: candidate.valid_to || candidate.validTo || input.validTo || null,
    confidence: Math.max(0, Math.min(1, Number(candidate.confidence ?? 1))),
    review_status: "pending",
    reviewed_by: null,
    reviewed_at: null
  }));
  for (const fact of facts) {
    if (!fact.source_version_id) throw factError("Ogni fatto richiede source_version_id.");
    if (!Number.isFinite(fact.authority_level) || fact.authority_level < 0 || fact.authority_level > 100) {
      throw factError("authority_level non valido.");
    }
  }
  const relations = (input.relations || []).map((candidate, index) => Object.freeze({
    source_entity: normalizeAtomicString(candidate.source_entity || candidate.sourceEntity, `relations[${index}].source_entity`),
    relation_type: normalizeAtomicString(candidate.relation_type || candidate.relationType, `relations[${index}].relation_type`, 120),
    target_entity: normalizeAtomicString(candidate.target_entity || candidate.targetEntity, `relations[${index}].target_entity`),
    domain: candidate.domain || input.domain || null,
    properties: Object.freeze({ ...(candidate.properties || {}) }),
    source_version_id: candidate.source_version_id || candidate.sourceVersionId || defaultSourceVersionId || null,
    review_status: "pending"
  }));
  return Object.freeze({
    facts: Object.freeze(facts),
    relations: Object.freeze(relations),
    autoPublished: false,
    extractionMode: options.mode || "structured_input_only"
  });
}

export function approveStructuredFacts(facts = [], reviewer = {}, options = {}) {
  if (options.explicitApproval !== true || !(reviewer.id || reviewer.user_id)) {
    throw new Error("Approvazione esplicita Founder/revisore obbligatoria.");
  }
  const now = (options.clock || (() => new Date()))().toISOString();
  return facts.map((fact) => Object.freeze({
    ...fact,
    review_status: "approved",
    reviewed_by: reviewer.id || reviewer.user_id,
    reviewed_at: now
  }));
}
