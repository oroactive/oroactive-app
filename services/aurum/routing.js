function normalizeIntentText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasStrongComproOroSectorIntent(question = "", sectorMatches = [], coachingKnowledge = {}) {
  const normalized = normalizeIntentText(question);
  const sectorScore = Number(sectorMatches[0]?.score || 0);
  const coachingScore = Number(coachingKnowledge.matches?.[0]?.score || 0);
  const hasUnambiguousRegulatedMarker = /\b(?:oam|uif|sos|operazione sospetta|antiriciclaggio|registro (?:oam|degli operatori compro oro|operatori compro oro)|d ?lgs ?92(?:\/2017)?|d ?m ?14 maggio 2018)\b/.test(normalized);
  if (hasUnambiguousRegulatedMarker && sectorScore >= 20) return true;
  const hasSectorMarker = /(compro oro|atto di vendita|contante|pagamento|quotazione|valutazione (?:dell |di )?oro|prezzo (?:dell |di )?oro|carat|titolo dell oro|bilancia|xrf|pietra di paragone|acido nitrico)/.test(normalized);
  return hasSectorMarker && sectorScore >= Math.max(40, coachingScore * 1.25);
}

function isSaleDeedSection(section = "") {
  return ["practice", "nuovo atto vendita"].includes(normalizeIntentText(section));
}

function hasExplicitSaleDeedFormIntent(question = "") {
  const normalized = normalizeIntentText(question);
  if (!normalized) return false;
  return /\b(?:atto di vendita|pratica di vendita|modulo(?: dell atto| di vendita)?|compil\w*|campo|voce (?:del|dell|nel) modulo|inserir\w* (?:nel|nella|sul|sulla)|scriver\w* (?:nel|nella|sul|sulla)|selezionar\w* (?:nel|nella|sul|sulla)|firma (?:del|dell|sull)|allegat\w* (?:al|all)|numero atto|note operatore|controllo qualita)\b/.test(normalized);
}

export function hasSaleDeedIntent(question = "", matches = [], options = {}) {
  if (!matches.length) return false;
  if (String(options.requestedFieldId || "").trim()) return true;
  const topScore = Number(matches[0]?.score || 0);
  if (topScore < 24) return false;
  return isSaleDeedSection(options.section) || hasExplicitSaleDeedFormIntent(question);
}

export function resolveAurumKnowledgeRoute({
  question = "",
  requestedFieldId = "",
  section = "",
  gemIntent = false,
  saleMatches = [],
  sectorMatches = [],
  coachingKnowledge = {},
  isNormativeQuestion = false
} = {}) {
  const saleIntent = hasSaleDeedIntent(question, saleMatches, { requestedFieldId, section });
  const hasSaleDeedContext = saleIntent && (Boolean(String(requestedFieldId || "").trim()) || !gemIntent);
  const hasGemologicalContext = Boolean(gemIntent) && !hasSaleDeedContext;
  const strongSectorPriority = Boolean(isNormativeQuestion)
    || hasStrongComproOroSectorIntent(question, sectorMatches, coachingKnowledge);
  return Object.freeze({
    saleIntent,
    hasSaleDeedContext,
    hasGemologicalContext,
    strongSectorPriority
  });
}
