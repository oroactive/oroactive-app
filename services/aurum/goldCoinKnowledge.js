import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(__dirname, "../../assets/aurum-knowledge/coins/gold-coin-catalog.json");

const COMMON_SOURCES = Object.freeze([
  {
    title: "Commissione europea — elenco 2026 delle monete d'oro da investimento",
    url: "https://eur-lex.europa.eu/eli/C/2025/5923/oj/ita",
    authority: "Commissione europea"
  },
  {
    title: "British Museum — Department of Money and Medals",
    url: "https://www.britishmuseum.org/our-work/departments/money-and-medals",
    authority: "British Museum"
  }
]);

const FAMILY_SOURCES = Object.freeze([
  {
    pattern: /sterlina|sovereign/i,
    source: {
      title: "The Royal Mint — storia e disegni della Sovereign",
      url: "https://www.royalmint.com/stories/sovereign/the-sovereign-reverse-designs/",
      authority: "The Royal Mint"
    }
  },
  {
    pattern: /american eagle|america aquila/i,
    source: {
      title: "United States Mint — American Eagle Gold specifications",
      url: "https://www.usmint.gov/learn/coins-and-medals/collectible-coins/american-eagle",
      authority: "United States Mint"
    }
  },
  {
    pattern: /double eagle|dollari liberty|saint.?gaudens|st\.? gaudens/i,
    source: {
      title: "United States Mint — storia delle Gold Eagle coins",
      url: "https://www.usmint.gov/learn/coins-and-medals/circulating-coins/gold-eagles",
      authority: "United States Mint"
    }
  },
  {
    pattern: /libertad/i,
    source: {
      title: "Banco de México — Serie Libertad oro e dati tecnici",
      url: "https://www.banxico.org.mx/banknotes-and-coins/libertad-series-gold-banco-me001.html",
      authority: "Banco de México"
    }
  },
  {
    pattern: /centenario|50 pesos/i,
    source: {
      title: "Banco de México — Centenario, storia e specifiche",
      url: "https://www.banxico.org.mx/banknotes-and-coins/centenario-gold-banco-mexico.html",
      authority: "Banco de México"
    }
  },
  {
    pattern: /kangaroo|canguro|nugget/i,
    source: {
      title: "The Perth Mint — Australian Nugget/Kangaroo mintages",
      url: "https://www.perthmint.com/globalassets/assets/documents/mintages/bullion/koala-kangaroo-kookaburra/the-australian-nugget-kangaroo-gold-bullion-coin-series-1987-2022-may-24.pdf",
      authority: "The Perth Mint"
    }
  },
  {
    pattern: /krugerrand/i,
    source: {
      title: "South African Mint — archivio ufficiale Krugerrand",
      url: "https://www.samint.co.za/feb-newsletter/",
      authority: "South African Mint"
    }
  },
  {
    pattern: /maple leaf|foglia d.acero/i,
    source: {
      title: "Royal Canadian Mint — Gold Maple Leaf specifications",
      url: "https://www.mint.ca/en/shop/coins/2025/2025-gml-1-oz-9999-pure-gold-coin-bullion",
      authority: "Royal Canadian Mint"
    }
  },
  {
    pattern: /filarmonica|philharmonic/i,
    source: {
      title: "Austrian Mint — Vienna Philharmonic",
      url: "https://www.muenzeoesterreich.at/infothek/medien/ratgeber-anlegen/erfolgsgeschichte-wiener-philharmoniker",
      authority: "Austrian Mint"
    }
  },
  {
    pattern: /panda|cina/i,
    source: {
      title: "People's Bank of China — programma ufficiale Panda",
      url: "https://www.pbc.gov.cn/goutongjiaoliu/113456/113469/2025092212551094443/index.html",
      authority: "People's Bank of China"
    }
  }
]);

const COUNTRY_ALIASES = Object.freeze(new Map([
  ["francia", ["francia", "francese", "francesi"]],
  ["regno unito", ["regno unito", "britannica", "britanniche", "inglese", "inglesi"]],
  ["italia", ["italia", "italiana", "italiane"]],
  ["stati uniti", ["stati uniti", "americana", "americane", "usa"]],
  ["messico", ["messico", "messicana", "messicane"]],
  ["canada", ["canada", "canadese", "canadesi"]],
  ["australia", ["australia", "australiana", "australiane"]],
  ["austria", ["austria", "austriaca", "austriache"]],
  ["sud africa", ["sud africa", "sudafrica", "sudafricana", "sudafricane"]],
  ["cina", ["cina", "cinese", "cinesi"]],
  ["russia", ["russia", "russa", "russe"]],
  ["svizzera", ["svizzera", "svizzere"]],
  ["belgio", ["belgio", "belga", "belghe"]],
  ["paesi bassi", ["paesi bassi", "olandese", "olandesi"]],
  ["germania", ["germania", "tedesca", "tedesche"]],
  ["ungheria", ["ungheria", "ungherese", "ungheresi"]],
  ["peru", ["peru", "peruviana", "peruviane"]],
  ["cile", ["cile", "cilena", "cilene"]],
  ["armenia", ["armenia", "armena", "armene"]],
  ["somalia", ["somalia", "somala", "somale"]]
]));

const STOP_WORDS = new Set([
  "alla", "alle", "allo", "come", "dati", "della", "delle", "dello", "diametro", "fammi", "finezza",
  "informazioni", "moneta", "monete", "nominale", "oro", "peso", "quale", "quali", "raccontami", "scheda",
  "specifiche", "storia", "tecniche", "titolo", "valore"
]);

export function normalizeGoldCoinText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadCatalog() {
  const parsed = JSON.parse(readFileSync(catalogPath, "utf8"));
  if (!parsed || !Array.isArray(parsed.coins) || parsed.coins.length !== 197) {
    throw new Error("Catalogo numismatico Aurum non valido o non sincronizzato.");
  }
  const ids = new Set();
  for (const coin of parsed.coins) {
    if (!coin?.id || ids.has(coin.id)) throw new Error(`Moneta Aurum duplicata o senza id: ${coin?.id || "senza-id"}`);
    ids.add(coin.id);
    for (const field of ["name", "country", "mintYears", "nominal", "purityLabel", "edge", "obverse", "reverse", "history"]) {
      if (!String(coin[field] || "").trim()) throw new Error(`Moneta Aurum incompleta: ${coin.id}.${field}`);
    }
    for (const field of ["purity", "grossWeight", "fineGold", "diameter"]) {
      if (!(Number(coin[field]) > 0)) throw new Error(`Dato tecnico Aurum non valido: ${coin.id}.${field}`);
    }
  }
  return Object.freeze({
    ...parsed,
    coins: Object.freeze(parsed.coins.map((coin) => Object.freeze(coin)))
  });
}

export const AURUM_GOLD_COIN_CATALOG = loadCatalog();

function requestedCountry(normalizedQuery = "") {
  for (const [country, aliases] of COUNTRY_ALIASES) {
    if (aliases.some((alias) => ` ${normalizedQuery} `.includes(` ${normalizeGoldCoinText(alias)} `))) return country;
  }
  return "";
}

const coinIndex = AURUM_GOLD_COIN_CATALOG.coins.map((coin, position) => ({
  coin,
  position,
  name: normalizeGoldCoinText(coin.name),
  country: normalizeGoldCoinText(coin.country),
  identity: normalizeGoldCoinText([coin.id, coin.name, coin.nominal, coin.mintYears, ...(coin.recognitionHints || [])].join(" ")),
  history: normalizeGoldCoinText([coin.history, coin.obverse, coin.reverse].join(" "))
}));

function queryTokens(normalizedQuery = "") {
  return [...new Set(normalizedQuery.split(" ").filter((token) => token.length >= 2 && !STOP_WORDS.has(token)))];
}

const DISTINCTIVE_COIN_PHRASES = Object.freeze([
  "american eagle", "double eagle", "maple leaf", "foglia d acero", "saint gaudens",
  "platinum jubilee", "vittorio emanuele", "napoleone iii", "elisabetta ii", "carlo iii"
]);

function requestedSizePhrases(normalizedQuery = "") {
  return [...new Set([
    ...normalizedQuery.matchAll(/\b\d+(?: \d+)? oz\b/g),
    ...normalizedQuery.matchAll(/\b\d+(?:[.,]\d+)? (?:grammi|grammo|g)\b/g)
  ].map((match) => match[0].replace(",", ".")))];
}

function coinScore(entry, normalizedQuery, tokens, options = {}) {
  let score = options.countryMatch ? 12 : 0;
  let matched = 0;
  if (` ${normalizedQuery} `.includes(` ${entry.name} `)) score += 500;
  if (` ${entry.identity} `.includes(` ${normalizedQuery} `)) score += 180;
  for (const token of tokens) {
    if (` ${entry.name} `.includes(` ${token} `)) {
      score += 22;
      matched += 1;
    } else if (` ${entry.identity} `.includes(` ${token} `)) {
      score += 12;
      matched += 1;
    } else if (` ${entry.country} `.includes(` ${token} `)) {
      score += 10;
      matched += 1;
    } else if (` ${entry.history} `.includes(` ${token} `)) {
      score += 1;
      matched += 1;
    }
  }
  for (const phrase of DISTINCTIVE_COIN_PHRASES) {
    if (!wholePhrase(normalizedQuery, phrase)) continue;
    score += wholePhrase(entry.identity, phrase) ? 140 : -45;
  }
  for (const phrase of requestedSizePhrases(normalizedQuery)) {
    score += wholePhrase(entry.identity, phrase) ? 130 : -35;
  }
  if (matched) score += (matched / Math.max(1, tokens.length)) * 30;
  return Math.round(score * 100) / 100;
}

function wholePhrase(text = "", phrase = "") {
  return Boolean(phrase) && ` ${text} `.includes(` ${phrase} `);
}

export function searchGoldCoinKnowledge(query = "", options = {}) {
  const normalized = normalizeGoldCoinText(query);
  if (!normalized) return [];
  const limit = Math.max(1, Math.min(12, Number(options.limit || 5)));
  const country = requestedCountry(normalized);
  const tokens = queryTokens(normalized);
  const explicitCoinMarker = /\b(?:monet[a-z]*|numismatic[a-z]*|sterlina|sovereign|marengo|krugerrand|libertad|panda|maple leaf|foglia d acero|american eagle|aquila americana|double eagle|kangaroo|canguro|filarmonica|philharmonic|ducat[a-z]*|fiorin[a-z]*|gulden|pesos|rand|rubli|coron[a-z]*|scellin[a-z]*|franch[a-z]*|lire|dollar[a-z]*)\b/.test(normalized);
  if (!explicitCoinMarker && !country) return [];
  const ranked = coinIndex
    .filter((entry) => !country || entry.country === country)
    .map((entry) => ({
      coin: entry.coin,
      position: entry.position,
      score: coinScore(entry, normalized, tokens, { countryMatch: Boolean(country) })
    }))
    .filter((entry) => entry.score >= (country ? 8 : 18))
    .sort((left, right) => right.score - left.score || left.position - right.position);
  if (!ranked.length) return [];
  const floor = Math.max(country ? 8 : 18, ranked[0].score * 0.34);
  return ranked.filter(({ score }) => score >= floor).slice(0, limit).map(({ coin, score }) => ({ coin, score }));
}

export function hasGoldCoinKnowledgeIntent(question = "", matches = searchGoldCoinKnowledge(question)) {
  if (!matches.length) return false;
  const normalized = normalizeGoldCoinText(question);
  const explicit = /\b(?:monet[a-z]*|numismatic[a-z]*|sterlina|sovereign|marengo|krugerrand|libertad|panda|maple leaf|foglia d acero|american eagle|aquila americana|double eagle|kangaroo|canguro|filarmonica|philharmonic|ducat[a-z]*|fiorin[a-z]*|gulden|pesos|rand|rubli|franch[a-z]*|lire|dollar[a-z]*)\b/.test(normalized);
  return explicit && Number(matches[0]?.score || 0) >= 24;
}

export function goldCoinKnowledgeSources(matches = [], limit = 8) {
  const unique = new Map();
  const add = (source) => {
    if (!unique.has(source.url)) unique.set(source.url, {
      ...source,
      verifiedAt: AURUM_GOLD_COIN_CATALOG.verifiedAt,
      status: "fonte istituzionale consultata"
    });
  };
  for (const { coin } of matches) {
    const text = `${coin?.id || ""} ${coin?.name || ""}`;
    FAMILY_SOURCES.filter(({ pattern }) => pattern.test(text)).forEach(({ source }) => add(source));
  }
  COMMON_SOURCES.forEach(add);
  return [...unique.values()].slice(0, Math.max(1, Math.min(12, Number(limit || 8))));
}

function formatNumber(value, digits = 3) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: digits }).format(Number(value || 0));
}

export function formatGoldCoinKnowledgeContext(matches = [], options = {}) {
  const limit = Math.max(1, Math.min(5, Number(options.limit || 3)));
  return matches.slice(0, limit).map(({ coin, score }, index) => [
    `[Scheda Elenco Monete ${index + 1}; id=${coin.id}; punteggio=${score}]`,
    `Nome: ${coin.name}`,
    `Paese e periodo: ${coin.country}; ${coin.mintYears}`,
    `Specifiche: nominale ${coin.nominal}; titolo ${coin.purityLabel}; peso lordo ${coin.grossWeight} g; oro fino ${coin.fineGold} g; diametro ${coin.diameter} mm; bordo ${coin.edge}`,
    `Storia: ${coin.history}`,
    `Dritto: ${coin.obverse}`,
    `Rovescio: ${coin.reverse}`,
    `Avvertenza: verificare sempre anno, zecca, variante, tolleranze e autenticità fisica dell'esemplare.`
  ].join("\n")).join("\n\n---\n\n");
}

export function buildGoldCoinKnowledgeAnswer(question = "", matches = searchGoldCoinKnowledge(question)) {
  if (!matches.length) {
    return {
      risposta: "Non ho trovato una corrispondenza sufficientemente precisa nell'Elenco Monete OroActive. Indica paese, nome, sovrano, valore nominale, anno o legenda visibile.",
      sources: [],
      matches: []
    };
  }
  const coin = matches[0].coin;
  const sources = goldCoinKnowledgeSources(matches.slice(0, 1), 6);
  const related = matches.slice(1, 5);
  const lines = [
    coin.name,
    "",
    "Storia:",
    coin.history,
    "",
    "Specifiche tecniche dell'Elenco Monete:",
    `• Paese: ${coin.country}`,
    `• Periodo/emissione: ${coin.mintYears}`,
    `• Valore nominale: ${coin.nominal}`,
    `• Titolo: ${coin.purityLabel} (${formatNumber(Number(coin.purity) * 100, 2)}%)`,
    `• Peso lordo: ${formatNumber(coin.grossWeight)} g`,
    `• Oro fino: ${formatNumber(coin.fineGold)} g`,
    `• Diametro: ${formatNumber(coin.diameter, 2)} mm`,
    ...(coin.thickness ? [`• Spessore: ${formatNumber(coin.thickness, 2)} mm`] : []),
    `• Bordo: ${coin.edge}`,
    "",
    `Dritto: ${coin.obverse}`,
    `Rovescio: ${coin.reverse}`
  ];
  if (related.length) {
    lines.push("", "Schede correlate presenti nell'Elenco Monete:", ...related.map(({ coin: item }) => `• ${item.name} — ${item.country}, ${item.mintYears}`));
  }
  lines.push(
    "",
    `Fonti istituzionali consultate (verifica ${AURUM_GOLD_COIN_CATALOG.verifiedAt}):`,
    ...sources.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`),
    "",
    "Attenzione: peso, diametro, titolo e iconografia possono cambiare fra anno, zecca, variante, finitura o riconio. La scheda è formativa e non autentica il singolo esemplare: confronta sempre la specifica emissione e svolgi controlli fisici indipendenti."
  );
  return { risposta: lines.join("\n"), sources, matches };
}
