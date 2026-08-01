import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgeFilePath = path.resolve(__dirname, "../../assets/aurum-knowledge/sector/compro-oro-knowledge.json");

function loadKnowledge() {
  const parsed = JSON.parse(readFileSync(knowledgeFilePath, "utf8"));
  if (!parsed || !Array.isArray(parsed.topics) || !parsed.topics.length) {
    throw new Error("Knowledge base settoriale Aurum non valida.");
  }
  const ids = new Set();
  for (const topic of parsed.topics) {
    if (!topic?.id || ids.has(topic.id)) throw new Error(`Topic Aurum duplicato o privo di id: ${topic?.id || "senza-id"}`);
    ids.add(topic.id);
    if (!topic.title || !topic.category || !topic.summary) throw new Error(`Topic Aurum incompleto: ${topic.id}`);
    if (!Array.isArray(topic.sources) || !topic.sources.length) throw new Error(`Topic Aurum senza fonti: ${topic.id}`);
    for (const source of topic.sources) {
      if (!source?.title || !source?.url || !/^https:\/\//i.test(source.url)) {
        throw new Error(`Fonte Aurum non valida nel topic ${topic.id}`);
      }
    }
  }
  return Object.freeze({
    ...parsed,
    topics: Object.freeze(parsed.topics.map((topic) => Object.freeze(topic)))
  });
}

export const AURUM_SECTOR_KNOWLEDGE = loadKnowledge();

const stopWords = new Set([
  "agli", "alla", "alle", "allo", "anche", "avere", "come", "cosa", "dai", "dal", "dalla", "dalle",
  "degli", "dei", "del", "della", "delle", "dello", "dopo", "essere", "fare", "fatto", "gli", "nella",
  "nelle", "ogni", "oggi", "perche", "posso", "prima", "quale", "quali", "quando", "quanto", "questa",
  "queste", "questi", "questo", "sono", "sulla", "sulle", "tutto", "tutte", "tutti", "una", "uno",
  "usare", "viene"
]);

const queryAliases = new Map([
  ["caratura", ["carati", "titolo", "millesimi", "finezza"]],
  ["carato", ["carati", "titolo", "millesimi", "finezza"]],
  ["contanti", ["pagamento", "500", "tracciabile", "frazionata"]],
  ["documenti", ["identificazione", "cliente", "conservazione"]],
  ["foto", ["fotografie", "scheda", "operazione"]],
  ["falso", ["contraffazione", "screening", "inconcludente"]],
  ["sintetico", ["sintetica", "sintetici", "sintetiche", "laboratory-grown"]],
  ["termico", ["tester termico", "screening", "pass", "refer"]],
  ["tester", ["tester termico", "screening", "pass", "refer"]],
  ["laboratorio", ["analisi", "saggio", "gemmologico"]],
  ["prezzo", ["quotazione", "valore", "grammi fini", "spread"]],
  ["vale", ["valore", "prezzo", "quotazione", "offerta"]],
  ["valore", ["prezzo", "quotazione", "offerta", "stima"]],
  ["valuto", ["valutazione", "prezzo", "peso netto", "titolo", "smontaggio"]],
  ["valutare", ["valutazione", "prezzo", "peso netto", "titolo", "smontaggio"]],
  ["collana", ["gioiello", "oggetto", "pietre", "peso netto", "smontaggio"]],
  ["strumenti", ["attrezzatura", "bilancia", "xrf", "tester"]],
  ["legge", ["normativa", "decreto", "obblighi"]],
  ["licenza", ["tulps", "questura", "oam", "registro"]],
  ["privacy", ["gdpr", "dati personali", "sicurezza"]],
  ["acido", ["pietra di paragone", "corrosivo", "sds"]],
  ["bilancia", ["metrologia", "pesatura", "verificazione"]],
  ["lingotto", ["ultrasuoni", "xrf", "densita", "contraffazione"]],
  ["antiriciclaggio", ["sos", "uif", "anomalia", "d.lgs. 231/2007"]],
  ["iva", ["fiscale", "oro da investimento", "reverse charge", "regime del margine"]],
  ["commercialista", ["contabilità", "fiscalità", "bilancio", "adempimenti", "piano dei conti"]],
  ["contabilita", ["commercialista", "prima nota", "partita doppia", "bilancio", "registri"]],
  ["contabile", ["commercialista", "contabilità", "prima nota", "partita doppia"]],
  ["nota", ["prima nota", "scrittura contabile", "documento acquisto"]],
  ["fonderia", ["reverse charge", "oro industriale", "fusione", "affinazione", "N6.2"]],
  ["margine", ["regime del margine", "beni usati", "iva incorporata"]],
  ["magazzino", ["inventario", "rimanenze", "lotto", "giacenza", "cali"]],
  ["rimanenze", ["inventario", "magazzino", "lotto", "costo specifico"]],
  ["cespite", ["cespiti", "ammortamento", "immobilizzazioni materiali"]],
  ["ammortamento", ["cespiti", "strumentazione", "vita utile", "registro beni ammortizzabili"]],
  ["fattura", ["fatturazione elettronica", "sdi", "registri iva", "conservazione"]],
  ["bilancio", ["chiusura", "imposte", "scadenziario", "rimanenze", "cespiti"]],
  ["f24", ["imposte", "versamento", "scadenziario", "commercialista"]],
  ["cash", ["cash flow", "flusso di cassa", "capitale circolante", "controllo di gestione"]]
]);

export function normalizeSectorKnowledgeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTerms(query = "") {
  const normalized = normalizeSectorKnowledgeText(query);
  const rawTerms = [...new Set(normalized
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term)))];
  const originalTerms = [...new Set(rawTerms.map(canonicalSectorToken))];
  const aliasTerms = new Set();
  for (const term of rawTerms) {
    for (const alias of queryAliases.get(term) || []) {
      normalizeSectorKnowledgeText(alias)
        .split(" ")
        .filter((item) => item.length >= 3 && !stopWords.has(item))
        .map(canonicalSectorToken)
        .forEach((item) => aliasTerms.add(item));
    }
  }
  originalTerms.forEach((term) => aliasTerms.delete(term));
  return { normalized, originalTerms, aliasTerms: [...aliasTerms] };
}

function canonicalSectorToken(value = "") {
  const token = String(value || "");
  if (token.length >= 5 && /[aeiou]$/.test(token)) return token.slice(0, -1);
  return token;
}

function sectorTokenSet(value = "") {
  return new Set(normalizeSectorKnowledgeText(value)
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term))
    .map(canonicalSectorToken));
}

const topicSearchIndex = AURUM_SECTOR_KNOWLEDGE.topics.map((topic) => {
  const title = normalizeSectorKnowledgeText(topic.title);
  const category = normalizeSectorKnowledgeText(topic.category);
  const keywordPhrases = (topic.keywords || []).map(normalizeSectorKnowledgeText).filter(Boolean);
  const keywords = keywordPhrases.join(" ");
  const body = normalizeSectorKnowledgeText([
    topic.summary,
    ...(topic.facts || []),
    ...(topic.checklist || []),
    ...(topic.warnings || [])
  ].join(" "));
  return {
    topic,
    title,
    category,
    keywordPhrases,
    titleTokens: sectorTokenSet(title),
    categoryTokens: sectorTokenSet(category),
    keywordTokens: sectorTokenSet(keywords),
    bodyTokens: sectorTokenSet(body),
    allTokens: sectorTokenSet(`${title} ${category} ${keywords} ${body}`)
  };
});

const topicTokenFrequency = new Map();
for (const entry of topicSearchIndex) {
  for (const token of entry.allTokens) {
    topicTokenFrequency.set(token, Number(topicTokenFrequency.get(token) || 0) + 1);
  }
}

function tokenRarity(token) {
  const documentFrequency = Number(topicTokenFrequency.get(token) || 0);
  return 1 + Math.log((AURUM_SECTOR_KNOWLEDGE.topics.length + 1) / (documentFrequency + 1));
}

function wholePhraseIncludes(text = "", phrase = "") {
  return Boolean(phrase) && ` ${text} `.includes(` ${phrase} `);
}

const topicIntentBoosts = [
  {
    pattern: /\b(?:vale|valore|valut[a-z]*|prezzo|quotazione|offerta|stima)\b.*\b(?:oro|argento|platino|palladio|metallo|usato)\b|\b(?:oro|argento|platino|palladio|metallo|usato)\b.*\b(?:vale|valore|valut[a-z]*|prezzo|quotazione|offerta|stima)\b/,
    boosts: { "prezzo-quotazione-spread": 90 }
  },
  {
    pattern: /\b(?:collana|anello|bracciale|gioiello|oggetto)\b.*\b(?:pietra|pietre|gemma|gemme)\b|\b(?:pietra|pietre|gemma|gemme)\b.*\b(?:collana|anello|bracciale|gioiello|oggetto)\b/,
    boosts: { "flusso-accettazione-tecnica": 100, "calo-fusione-campionamento": 65 }
  },
  {
    pattern: /\b(?:tester|termico|pass|refer|screening)\b.*\b(?:diamante|diamanti|sintetico|laboratory grown)\b|\b(?:diamante|diamanti|sintetico|laboratory grown)\b.*\b(?:tester|termico|pass|refer|screening)\b/,
    boosts: { "screening-diamanti-pass-refer": 90 }
  },
  {
    pattern: /\bxrf\b.*\b(?:placcato|rivestito|rodiato|superficie)\b|\b(?:placcato|rivestito|rodiato|superficie)\b.*\bxrf\b/,
    boosts: { "xrf-fluorescenza-raggi-x": 60 }
  },
  {
    pattern: /\b(?:smeraldo|rubino|zaffiro|ametista|acquamarina|tanzanite|topazio|opale|granato)\b.*\b(?:riconosc[a-z]*|identific[a-z]*|sintetic[a-z]*|natural[a-z]*|trattat[a-z]*)\b|\b(?:riconosc[a-z]*|identific[a-z]*|sintetic[a-z]*|natural[a-z]*|trattat[a-z]*)\b.*\b(?:smeraldo|rubino|zaffiro|ametista|acquamarina|tanzanite|topazio|opale|granato)\b/,
    boosts: { "gemme-identificazione-prudente": 120 }
  },
  {
    pattern: /\b(?:commercialista|contabilita|contabile|fiscalista)\b.*\b(?:compro oro|negozio|oro|preziosi|attivita|lavoro|gestione)\b|\b(?:compro oro|negozio|oro|preziosi|attivita)\b.*\b(?:commercialista|contabilita|contabile|fiscalista)\b/,
    boosts: { "commercialista-compro-oro-mandato-flusso": 130 }
  },
  {
    pattern: /\bprima nota\b|\b(?:registr[a-z]*|contabilizz[a-z]*|scrittur[a-z]*)\b.*\b(?:acquisto|privato|lotto|pagamento)\b/,
    boosts: { "prima-nota-acquisti-privati-partita-doppia": 130 }
  },
  {
    pattern: /\b(?:classific[a-z]*|trattamento|regime)\b.*\b(?:lotto|gioiello|oro usato|rottame|fusione|investimento)\b/,
    boosts: { "classificazione-fiscale-lotti-preziosi": 105 }
  },
  {
    pattern: /\bregime (?:iva )?del margine\b|\b(?:margine)\b.*\b(?:gioiello|bene usato|privato|iva)\b/,
    boosts: { "iva-margine-gioielli-usati": 145 }
  },
  {
    pattern: /\b(?:reverse charge|inversione contabile|n6 2|td16)\b|\b(?:fonderia|affinazione|fusione)\b.*\b(?:iva|fattura|oro|lotto)\b/,
    boosts: { "reverse-charge-oro-industriale-fonderia": 150 }
  },
  {
    pattern: /\b(?:fattura elettronica|sdi|scarto sdi|registri? iva|conservazione digitale|bollo)\b/,
    boosts: { "fatturazione-elettronica-registri-iva-conservazione": 130 }
  },
  {
    pattern: /\b(?:inventario|rimanenze|magazzino|giacenze|cut off|costo specifico)\b.*\b(?:lotto|oro|preziosi|compro oro|fine anno|chiusura|calo|fusione)\b|\b(?:lotto|oro|preziosi|compro oro)\b.*\b(?:inventario|rimanenze|magazzino|giacenze|cut off)\b/,
    boosts: { "inventario-rimanenze-lotti-cali": 145 }
  },
  {
    pattern: /\b(?:cespite|cespiti|ammortamento|immobilizzazione)\b.*\b(?:xrf|bilancia|strumento|strumentazione|cassaforte|microscopio)\b|\b(?:xrf|bilancia|strumento|strumentazione|cassaforte|microscopio)\b.*\b(?:cespite|cespiti|ammortamento|immobilizzazione)\b/,
    boosts: { "cespiti-ammortamenti-strumentazione": 150 }
  },
  {
    pattern: /\b(?:f24|lipe|dichiarazione iva|dichiarazione redditi|scadenziario|chiusura mensile|chiusura annuale|bilancio)\b/,
    boosts: { "chiusure-bilancio-imposte-scadenziario": 125 }
  },
  {
    pattern: /\b(?:cash flow|flusso di cassa|break even|capitale circolante|controllo di gestione|giorni di magazzino|kpi)\b|\b(?:margine|redditivita)\b.*\b(?:lotto|negozio|sede|gestione)\b/,
    boosts: { "controllo-gestione-margini-cash-flow": 140 }
  }
];

function topicScore(entry, normalizedQuery, originalTerms, aliasTerms) {
  let score = 0;
  let anchored = false;
  let originalCoverage = 0;
  if (wholePhraseIncludes(entry.title, normalizedQuery)) {
    score += 40;
    anchored = true;
  }
  for (const phrase of entry.keywordPhrases) {
    const phraseWords = phrase.split(" ").filter(Boolean);
    if (phraseWords.length >= 2 && wholePhraseIncludes(normalizedQuery, phrase)) {
      score += 18 + Math.min(12, phraseWords.length * 3);
      anchored = true;
    }
  }
  for (const term of originalTerms) {
    const rarity = tokenRarity(term);
    const matches = entry.allTokens.has(term);
    if (matches) originalCoverage += 1;
    if (entry.titleTokens.has(term)) {
      score += 7 * rarity;
      anchored = true;
    }
    if (entry.categoryTokens.has(term)) {
      score += 2 * rarity;
      anchored = true;
    }
    if (entry.keywordTokens.has(term)) {
      score += 6 * rarity;
      anchored = true;
    }
    if (entry.bodyTokens.has(term)) score += 1 * rarity;
  }
  for (const term of aliasTerms) {
    const rarity = tokenRarity(term);
    if (entry.titleTokens.has(term)) score += 1.75 * rarity;
    if (entry.keywordTokens.has(term)) score += 1.5 * rarity;
    if (entry.bodyTokens.has(term)) score += 0.25 * rarity;
  }
  if (originalCoverage) score += (originalCoverage / Math.max(1, originalTerms.length)) * 8;
  for (const intent of topicIntentBoosts) {
    if (intent.pattern.test(normalizedQuery)) {
      const boost = Number(intent.boosts[entry.topic.id] || 0);
      score += boost;
      if (boost > 0) anchored = true;
    }
  }
  return { score: Math.round(score * 100) / 100, anchored };
}

export function searchSectorKnowledge(query = "", options = {}) {
  const limit = Math.max(1, Math.min(8, Number(options.limit || 4)));
  const minimumScore = Number(options.minScore || 5);
  const { normalized, originalTerms, aliasTerms } = queryTerms(query);
  if (!normalized || !originalTerms.length) return [];
  const ranked = topicSearchIndex
    .map((entry) => ({ topic: entry.topic, ...topicScore(entry, normalized, originalTerms, aliasTerms) }))
    .filter((item) => item.anchored && item.score >= minimumScore)
    .sort((left, right) => right.score - left.score || left.topic.title.localeCompare(right.topic.title, "it"));
  const relevanceFloor = Math.max(minimumScore, Number(ranked[0]?.score || 0) * 0.45);
  return ranked
    .filter((item) => item.score >= relevanceFloor)
    .slice(0, limit)
    .map(({ topic, score }) => ({ topic, score }));
}

export function sectorKnowledgeSources(matches = [], limit = 8) {
  const unique = new Map();
  for (const match of matches) {
    for (const source of match.topic?.sources || []) {
      if (!unique.has(source.url)) {
        unique.set(source.url, {
          title: source.title,
          url: source.url,
          authority: source.authority || "",
          verifiedAt: source.verifiedAt || AURUM_SECTOR_KNOWLEDGE.verifiedAt,
          status: source.status || "vigente/verificata"
        });
      }
    }
  }
  return [...unique.values()].slice(0, Math.max(1, Math.min(12, Number(limit || 8))));
}

export function formatSectorKnowledgeContext(matches = []) {
  return matches.map(({ topic, score }, index) => {
    const sources = (topic.sources || []).map((source) => `${source.title} — ${source.url}`).join(" | ");
    return [
      `[Conoscenza settoriale ${index + 1}; id=${topic.id}; categoria=${topic.category}; punteggio=${score}]`,
      `Titolo: ${topic.title}`,
      `Sintesi: ${topic.summary}`,
      `Dati verificati: ${(topic.facts || []).join(" | ")}`,
      `Procedura: ${(topic.checklist || []).join(" | ")}`,
      `Limiti e avvertenze: ${(topic.warnings || []).join(" | ")}`,
      `Fonti: ${sources}`,
      `Verificato il: ${AURUM_SECTOR_KNOWLEDGE.verifiedAt}`
    ].filter(Boolean).join("\n");
  }).join("\n\n---\n\n");
}

export function buildSectorKnowledgeAnswer(question = "", matches = searchSectorKnowledge(question)) {
  if (!matches.length) {
    return {
      risposta: "Non ho trovato una risposta sufficientemente specifica nella base settoriale verificata di Aurum. Formula la domanda indicando materiale, prova, strumento o adempimento; per decisioni legali, fiscali o diagnostiche usa anche il professionista competente.",
      sources: []
    };
  }
  const primaryMatch = matches[0];
  const primary = primaryMatch.topic;
  const facts = (primary.facts || []).slice(0, 8);
  const checklist = (primary.checklist || []).slice(0, 6);
  const warnings = (primary.warnings || []).slice(0, 4);
  const sources = sectorKnowledgeSources([primaryMatch], 8);
  const lines = [
    primary.title,
    "",
    primary.summary
  ];
  if (facts.length) lines.push("", "Dati verificati:", ...facts.map((fact) => `• ${fact}`));
  if (checklist.length) lines.push("", "Come operare:", ...checklist.map((step, index) => `${index + 1}. ${step}`));
  if (warnings.length) lines.push("", "Attenzione:", ...warnings.map((warning) => `• ${warning}`));
  lines.push(
    "",
    `Fonti verificate il ${AURUM_SECTOR_KNOWLEDGE.verifiedAt}:`,
    ...sources.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`),
    "",
    primary.category === "Normativa e compliance"
      ? "Informazione operativa generale: per il caso concreto verifica il testo vigente e il professionista competente."
      : ["Fiscalità", "Contabilità e controllo"].includes(primary.category)
        ? "Informazione teorica specialistica: il trattamento reale dipende da forma giuridica, regime contabile, documenti e fatti dell’operazione e deve essere validato dal commercialista incaricato."
        : "Le prove di banco sono screening: una conclusione definitiva può richiedere un laboratorio qualificato."
  );
  return { risposta: lines.join("\n"), sources };
}
