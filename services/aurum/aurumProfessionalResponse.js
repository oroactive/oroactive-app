import { buildCitations, validateAurumAnswer } from "./knowledge/index.js";

const LAW_DOMAINS = new Set(["legal_compro_oro", "aml_ctf", "privacy", "ai_governance", "tax_accounting"]);
const TECHNICAL_DOMAINS = new Set([
  "assaying",
  "hallmarks",
  "jewellery_manufacturing",
  "jewellery_repairs",
  "gemology",
  "diamonds",
  "pearls",
  "coral",
  "numismatics",
  "bullion",
  "foundry",
  "refining",
  "bullion_desk",
  "responsible_sourcing"
]);

function text(value = "", max = 1200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

function normalizedRetrieved(items = []) {
  return list(items).map((item) => ({
    ...item,
    title: item.title || item.source_title || item.citation_label || item.subject || "Fonte Aurum",
    official_url: item.official_url || item.source?.official_url || null,
    organization: item.organization || item.source?.organization || null,
    source_key: item.source_key || item.source?.source_key || null
  }));
}

function uniqueCitationInputs(retrieved) {
  const candidates = normalizedRetrieved(retrieved);
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.source_key || ""}|${candidate.official_url || ""}|${candidate.article_number || ""}|${candidate.section_path || ""}`;
    if (!candidate.source_key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function factText(item = {}) {
  if (item.subject && item.predicate && item.object_value !== undefined) {
    const object = typeof item.object_value === "string" ? item.object_value : JSON.stringify(item.object_value);
    return text(`${item.subject}: ${item.predicate} ${object}`, 700);
  }
  return text(item.content || item.text || item.title || "", 700);
}

function procedureSteps(items = []) {
  return list(items).filter((item) => item.fact_type === "procedure" || item.type === "procedure")
    .flatMap((item) => text(item.content || "", 1800).split(/\n+/))
    .map((item) => text(item, 500)).filter(Boolean).slice(0, 8);
}

function classifications(route, citations, toolResults) {
  const result = [];
  const authority = Math.max(0, ...citations.map((source) => Number(source.authority_level || 0)));
  if (route.domains.some((domain) => LAW_DOMAINS.has(domain)) && authority >= 100) result.push("Obbligo di legge");
  else if (authority >= 95) result.push("Indicazione autorità");
  else if (route.domains.some((domain) => TECHNICAL_DOMAINS.has(domain)) && authority >= 90) result.push("Standard tecnico");
  else if (authority >= 85) result.push("Policy OroActive");
  else if (authority >= 70) result.push("Buona pratica");
  else result.push("Informazione da verificare");
  if (toolResults.length) result.push("Calcolo");
  if (["gemology", "diamonds", "assaying", "hallmarks"].some((domain) => route.domains.includes(domain))) {
    result.push("Valutazione preliminare");
  }
  return [...new Set(result)];
}

function escalationFor(route, confidence) {
  if (!route.access_allowed) return "Richiedere l'intervento del Founder: il dominio non è autorizzato per questo ruolo.";
  if (route.domains.includes("aml_ctf")) return "Sottoporre gli indicatori al responsabile AML; Aurum non decide né invia una SOS.";
  if (route.domains.includes("tax_accounting")) return "Informazione generale da verificare con il commercialista.";
  if (["gemology", "diamonds", "pearls", "coral"].some((domain) => route.domains.includes(domain))) {
    return "Per autenticità, origine o trattamenti richiedere un gemmologo qualificato o un laboratorio riconosciuto.";
  }
  if (confidence === "INSUFFICIENTE" || ["high", "critical"].includes(route.risk_level)) {
    return "Verificare il caso e la fonte vigente con il responsabile competente prima di una decisione definitiva.";
  }
  return null;
}

function risksFor(route) {
  const risks = [];
  if (route.live_data_required) risks.push("I dati live cambiano nel tempo e non costituiscono una verità permanente.");
  if (route.domains.includes("tax_accounting")) risks.push("Il trattamento fiscale dipende dai dati del caso e non è determinato autonomamente da Aurum.");
  if (route.domains.includes("aml_ctf")) risks.push("Gli indicatori richiedono valutazione umana e riservatezza; non informare il cliente di un eventuale sospetto.");
  if (["gemology", "diamonds", "assaying", "hallmarks"].some((domain) => route.domains.includes(domain))) {
    risks.push("Uno screening o una fotografia non certificano autenticità, titolo, origine o assenza di trattamenti.");
  }
  if (["foundry", "refining", "assaying"].some((domain) => route.domains.includes(domain))) {
    risks.push("Seguire manuale produttore, DPI e procedure autorizzate; Aurum non fornisce parametri chimici pericolosi.");
  }
  return risks;
}

function toolSummary(result = {}) {
  const details = [result.tool || result.name, result.status, result.result || result.value]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map((value) => typeof value === "object" ? JSON.stringify(value) : String(value));
  return text(details.join(" — ") || JSON.stringify(result), 900);
}

export function buildAurumProfessionalResponse({
  legacy = {},
  route = {},
  retrieved = [],
  toolResults = [],
  registry = null,
  retrievalError = "",
  clock = () => new Date()
} = {}) {
  const routed = {
    domains: list(route.domains),
    jurisdiction: route.jurisdiction || "IT",
    risk_level: route.risk_level || route.riskLevel || "low",
    minimum_authority_level: Number(route.minimum_authority_level ?? route.minimumAuthorityLevel ?? 40),
    minimum_citations: Number(route.minimum_citations ?? 1),
    access_allowed: route.access_allowed !== false,
    matched_by_keywords: route.matched_by_keywords !== false,
    live_data_required: Boolean(route.live_data_required ?? route.requiresLiveData),
    contains_personal_data: Boolean(route.pii_detected ?? route.containsPersonalData),
    requiresTool: Boolean(route.requiresTool),
    toolName: route.toolName || null
  };
  const evidence = uniqueCitationInputs(retrieved);
  const citations = buildCitations(evidence, { max: 4 });
  const enforceEvidence = routed.matched_by_keywords
    && routed.domains.length > 0
    && !routed.contains_personal_data
    && !legacy?.safety?.blockExternal;
  const validation = validateAurumAnswer({
    answer: legacy.risposta || legacy.answer || "",
    risk_level: routed.risk_level,
    citations
  }, {
    minimumCitations: enforceEvidence ? Math.max(1, routed.minimum_citations) : 0,
    minimumAuthorityLevel: routed.minimum_authority_level
  });
  const confidence = enforceEvidence ? validation.confidence : citations.length ? "BASSO" : "INSUFFICIENTE";
  const missingInformation = [];
  if (retrievalError) missingInformation.push("Il recupero della Knowledge Base non è stato completato; riprovare o verificare la fonte manualmente.");
  if (enforceEvidence && confidence === "INSUFFICIENTE") missingInformation.push("Manca almeno una fonte primaria approvata, vigente e pertinente al quesito.");
  if (routed.requiresTool && !toolResults.length) missingInformation.push(`Per eseguire ${routed.toolName || "il calcolo"} servono input strutturati completi.`);
  if (routed.live_data_required) missingInformation.push("Servono fonte, ora, valuta e unità del dato live.");
  const escalation = escalationFor(routed, confidence);
  const answer = !routed.access_allowed
    ? "Questa informazione è riservata a un ruolo autorizzato. Posso aiutarti con le procedure disponibili per il tuo profilo."
    : enforceEvidence && confidence === "INSUFFICIENTE"
      ? validation.answer
      : text(legacy.risposta || legacy.answer || validation.answer, 20_000);
  const factItems = normalizedRetrieved(retrieved).map(factText).filter(Boolean).slice(0, 8);
  const calculationItems = toolResults.map((result) => text(result.formula || toolSummary(result), 900)).filter(Boolean);
  const steps = procedureSteps(retrieved);
  const recommendedSteps = [];
  if (confidence === "INSUFFICIENTE") recommendedSteps.push("Consultare una fonte primaria corrente oppure inviare la voce alla Review Queue Founder.");
  if (routed.requiresTool && !toolResults.length) recommendedSteps.push("Aprire lo strumento deterministico indicato e fornire tutti i valori con unità.");
  if (routed.live_data_required) recommendedSteps.push("Aggiornare la quotazione e registrarne timestamp, valuta e fonte prima del calcolo.");
  if (escalation) recommendedSteps.push("Completare l'escalation indicata prima di assumere decisioni definitive.");
  return Object.freeze({
    answer,
    classification: classifications(routed, citations, toolResults),
    domain: routed.domains,
    jurisdiction: routed.jurisdiction,
    validAsOf: clock().toISOString().slice(0, 10),
    confidence,
    assumptions: [],
    missingInformation,
    sources: citations,
    toolResults: toolResults.map(toolSummary),
    recommendedSteps,
    risks: risksFor(routed),
    escalation,
    operationalReasoning: {
      facts: factItems,
      rules: [
        `Gerarchia fonti applicata con autorità minima ${routed.minimum_authority_level}.`,
        "Sono state considerate soltanto fonti approvate, correnti, pertinenti alla giurisdizione e consentite per il ruolo."
      ],
      calculations: calculationItems,
      steps,
      missingInformation
    }
  });
}
