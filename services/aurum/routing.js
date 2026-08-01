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
  const hasUnambiguousRegulatedMarker = /\b(?:oam|uif|sos|opo|operatore professionale in oro|operazione sospetta|dichiarazione oro|infostat|legge 7(?:\/2000)?|antiriciclaggio|registro (?:oam|opo|degli operatori compro oro|operatori compro oro)|d ?lgs ?92(?:\/2017)?|d ?lgs ?211(?:\/2024)?|d ?m ?14 maggio 2018)\b/.test(normalized);
  if (hasUnambiguousRegulatedMarker && sectorScore >= 20) return true;
  const hasSpecialistAccountingMarker = /\b(?:prima nota|partita doppia|regime iva|trattamento iva|natura iva|regime (?:iva )?del margine|reverse charge|inversione contabile|registri? iva|lipe|f24|sdi|rimanenze|cespiti|ammortamento|cash flow|controllo di gestione)\b/.test(normalized)
    || /\b(?:commercialista|contabilita|contabile|fiscalista)\b.*\b(?:compro oro|negozio|oro|preziosi|iva|bilancio|adempimenti|lavoro|svolge|funziona)\b/.test(normalized)
    || /\b(?:compro oro|negozio|oro|preziosi)\b.*\b(?:commercialista|contabilita|contabile|fiscalista)\b/.test(normalized);
  if (hasSpecialistAccountingMarker && sectorScore >= 24) return true;
  const hasBullionSpecialistMarker = /\b(?:good delivery|buona consegna|lingott[a-z]*|bullion|caveau|allocated|unallocated|riserve auree|banca d italia|quadro rw|monitoraggio fiscale|frontiera|dogana|adm)\b/.test(normalized);
  if (hasBullionSpecialistMarker && sectorScore >= 24) return true;
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
  const strongSectorPriority = Boolean(isNormativeQuestion)
    || hasStrongComproOroSectorIntent(question, sectorMatches, coachingKnowledge);
  const saleIntent = hasSaleDeedIntent(question, saleMatches, { requestedFieldId, section });
  const hasExplicitSaleDeedPriority = Boolean(String(requestedFieldId || "").trim())
    || hasExplicitSaleDeedFormIntent(question);
  const hasSaleDeedContext = saleIntent
    && (Boolean(String(requestedFieldId || "").trim()) || !gemIntent)
    && (!strongSectorPriority || hasExplicitSaleDeedPriority);
  const hasGemologicalContext = Boolean(gemIntent) && !hasSaleDeedContext && !strongSectorPriority;
  return Object.freeze({
    saleIntent,
    hasSaleDeedContext,
    hasGemologicalContext,
    strongSectorPriority
  });
}
