const SALES_CONTEXT_PATTERN = /\b(?:vendit[a-z]*|vendere|cliente|compro oro|gioielleria|gioiell[a-z]*|valutazione|offerta|prezzo|obiezion[a-z]*|negoziazion[a-z]*|persuasion[a-z]*|convinc[a-z]*|chiusura|closing|conversione|urgenza|scarsit[a-z]*|countdown|lasciare (?:il suo |l )?oro|role ?play)\b/;

const CONSULTATIVE_SALES_PATTERN = /\b(?:vendit[a-z]*|vendere|compro oro|gioielleria|persuasion[a-z]*|convinc[a-z]*|obiezion[a-z]*|negoziazion[a-z]*|chiusura|closing|conversione|offerta|falsa urgenza|scarsit[a-z]*|countdown|role ?play)\b/;

const PROTECTIVE_INTENT_PATTERN = /\b(?:evit[a-z]*|preven[a-z]*|tutel[a-z]*|proteg[a-z]*|senza (?:pressione|ingannare|manipolare|sfruttare)|non (?:usare|sfruttare|manipolare|fare pressione)|come riconoscere|perche (?:e|è) (?:vietat|scorrett)|fermare|sospendere)\b/;

const COERCIVE_PATTERNS = [
  { reason: "sfruttamento_vulnerabilita", pattern: /\b(?:sfrutt[a-z]*|approfitt[a-z]*|usare|fare leva)\b.{0,90}\b(?:lutto|vedov[a-z]*|debit[a-z]*|bisogno di denaro|difficolt[a-z]* economic[a-z]*|disperazion[a-z]*|anzian[a-z]*|confus[a-z]*|fragilit[a-z]*|malattia|dipendenza)\b/ },
  { reason: "pressione_emotiva", pattern: /\b(?:paura|senso di colpa|vergogna|umiliaz[a-z]*|minacc[a-z]*|intimid[a-z]*|pressione psicologica)\b/ },
  { reason: "ostacolo_al_rifiuto", pattern: /\b(?:non far(?:lo|la)? uscire|impedire.{0,30}(?:uscire|andarsene|confrontare)|non accettare (?:un )?no|insistere dopo (?:il )?no|chiudere a ogni costo)\b/ },
  { reason: "inganno_commerciale", pattern: /\b(?:nascond[a-z]*|omettere|non dire)\b.{0,70}\b(?:spread|margine|deduzion[a-z]*|costi|titolo|quotazione|metodo di prova|trattament[a-z]*|sintetic[a-z]*)\b/ },
  { reason: "falsa_urgenza", pattern: /\b(?:fals[a-z]* urgenza|fingere.{0,50}(?:scadenza|crollo|scarsit[a-z]*)|countdown fals[a-z]*|inventare.{0,40}(?:scadenza|scarsit[a-z]*))\b/ },
  { reason: "profilazione_persuasiva", pattern: /\b(?:usare|sfruttare|fare leva)\b.{0,90}\b(?:memori[a-z]*|confidenz[a-z]*|compleanno|dat[a-z]* sensibil[a-z]*|profilo psicologico|salute|situazione familiare)\b/ },
  { reason: "manipolazione_esplicita", pattern: /\b(?:manipol[a-z]*|coerciz[a-z]*|ipnosi|tecniche subliminali)\b/ }
];

const UNIVERSAL_CONVERSION_PATTERN = /\b(?:convinc[a-z]* ogni cliente|tutti i clienti.{0,30}(?:vend[a-z]*|accett[a-z]*)|conversione (?:al |del )?100\s*%|chiudere sempre|garantire la vendita)\b/;

export const SALES_COMMUNICATION_SAFETY_SOURCES = Object.freeze([
  Object.freeze({
    title: "Codice del consumo — pratiche commerciali scorrette e aggressive",
    url: "https://www.normattiva.it/eli/id/2005/10/08/005G0232/CONSOLIDATED/20250521",
    authority: "Normattiva",
    verifiedAt: "2 agosto 2026",
    status: "vigente/verificata"
  }),
  Object.freeze({
    title: "AGCM — Diritto di decidere senza condizionamenti",
    url: "https://convienesaperlo.agcm.it/diritto/diritto-di-decidere-senza-condizionamenti/",
    authority: "Autorità Garante della Concorrenza e del Mercato",
    verifiedAt: "2 agosto 2026",
    status: "verificata"
  }),
  Object.freeze({
    title: "ISO 22458:2022 — Consumer vulnerability",
    url: "https://www.iso.org/standard/73261.html",
    authority: "International Organization for Standardization",
    verifiedAt: "2 agosto 2026",
    status: "standard pubblicato"
  })
]);

function normalizeSalesSafetyText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifySalesCommunicationSafety(question = "") {
  const normalized = normalizeSalesSafetyText(question);
  if (!normalized || !SALES_CONTEXT_PATTERN.test(normalized)) {
    return Object.freeze({
      level: "none",
      reason: "not_sales_context",
      blockExternal: false,
      blockMemory: false,
      requiresReframe: false
    });
  }

  const protectiveIntent = PROTECTIVE_INTENT_PATTERN.test(normalized);
  const coerciveMatch = COERCIVE_PATTERNS.find(({ pattern }) => pattern.test(normalized));
  if (coerciveMatch && !protectiveIntent) {
    return Object.freeze({
      level: "coercive_sales",
      reason: coerciveMatch.reason,
      blockExternal: true,
      blockMemory: true,
      requiresReframe: true
    });
  }

  const consultativeSalesIntent = CONSULTATIVE_SALES_PATTERN.test(normalized)
    || /\bclient[a-z]*\b.*\b(?:valutazion[a-z]*|prezzo|oro|vulnerabil[a-z]*|anzian[a-z]*|confus[a-z]*|decisione|pressione)\b/.test(normalized);
  if (!consultativeSalesIntent) {
    return Object.freeze({
      level: "none",
      reason: "not_sales_intent",
      blockExternal: false,
      blockMemory: false,
      requiresReframe: false
    });
  }

  return Object.freeze({
    level: "consultative_sales",
    reason: UNIVERSAL_CONVERSION_PATTERN.test(normalized)
      ? "universal_conversion_claim_requires_reframe"
      : protectiveIntent
        ? "protective_sales_guidance"
        : "consultative_sales_guidance",
    blockExternal: false,
    blockMemory: true,
    requiresReframe: UNIVERSAL_CONVERSION_PATTERN.test(normalized)
  });
}

export function buildCoerciveSalesSafetyResponse() {
  return [
    "Vendita consulenziale: limite professionale",
    "",
    "Non posso aiutarti a esercitare pressione, ingannare o sfruttare una vulnerabilità per ottenere la vendita. Nel compro oro e in gioielleria l'obiettivo professionale è aumentare fiducia e chiarezza, non ottenere un sì a ogni costo.",
    "",
    "Procedura corretta:",
    "1. sospendi la chiusura e restituisci al cliente controllo, tempo e possibilità di uscire con i propri oggetti;",
    "2. mostra peso, titolo, metodo, quotazione con fonte e ora, deduzioni e totale offerto;",
    "3. verifica la comprensione con parole semplici e offri un preventivo scritto;",
    "4. presenta opzioni reali: procedere, vendere solo alcuni oggetti, non vendere, confrontare o tornare;",
    "5. se emergono lutto, confusione o difficoltà economica, rinvia e proponi una persona di fiducia scelta dal cliente.",
    "",
    "Molestie, coercizione e indebito condizionamento possono costituire pratiche commerciali aggressive. Nessuna tecnica legittima garantisce la conversione di ogni cliente: una decisione valida deve essere libera, informata e documentata."
  ].join("\n");
}
