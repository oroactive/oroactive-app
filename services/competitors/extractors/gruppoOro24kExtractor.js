import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const GRUPPO_ORO_24K_DEFAULT_URL = "https://www.comprooromilano.org";
const GRUPPO_ORO_24K_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const GRUPPO_ORO_24K_ALLOWED_HOSTS = ["comprooromilano.org"];
const GRUPPO_ORO_24K_HTML_MAX_BYTES = 2 * 1024 * 1024;

const GRUPPO_ORO_24K_DEFINITIONS = [
  {
    key: "gruppo_oro_24k_gold_24kt",
    label: "ORO 24 Carati",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    fineness_per_mille: 1000,
    quote_type: "customer_buyback",
    required: true,
    anchors: ["ORO 24 Carati", "Compro Oro 24 Carati"],
    defaultUnit: "EUR/g"
  },
  {
    key: "gruppo_oro_24k_gold_18kt",
    label: "ORO 18 Carati",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    fineness_per_mille: 750,
    quote_type: "customer_buyback",
    required: true,
    anchors: ["ORO 18 Carati", "Compro Oro 18 Carati"],
    defaultUnit: "EUR/g"
  },
  {
    key: "gruppo_oro_24k_silver_999",
    label: "Argento 999",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    fineness_per_mille: 999,
    quote_type: "customer_buyback",
    required: true,
    anchors: ["Argento 999", "Compro Argento 999"],
    defaultUnit: "EUR/g"
  },
  {
    key: "gruppo_oro_24k_silver_800",
    label: "Argento 800",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    fineness_per_mille: 800,
    quote_type: "customer_buyback",
    required: true,
    anchors: ["Argento 800", "Compro Argento 800"],
    defaultUnit: "EUR/g"
  }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&#x20AC;|&#8364;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&#038;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "’")
    .replace(/&quot;/gi, "\"");
}

export function parseItalianEuroPrice(value = "") {
  const raw = String(value || "").replace(/\u00a0/g, " ").replace(/[^\d,.\s]/g, "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/\s+/g, "");
  if (!/^(?:\d+|\d+[,.]\d+|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(compact)) return 0;
  if (compact.includes(",") && compact.includes(".")) {
    const commaIndex = compact.lastIndexOf(",");
    const dotIndex = compact.lastIndexOf(".");
    return commaIndex > dotIndex
      ? Number(compact.replace(/\./g, "").replace(",", "."))
      : Number(compact.replace(/,/g, ""));
  }
  if (compact.includes(",")) return Number(compact.replace(/\./g, "").replace(",", "."));
  const parts = compact.split(".");
  if (parts.length > 2) return Number(compact.replace(/\./g, ""));
  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) return Number(compact.replace(/\./g, ""));
  return Number(compact);
}

function unitFromText(value = "", fallback = "EUR/g") {
  const text = String(value || fallback || "").toLowerCase();
  if (/kg|chilo|chilogram|kilo/.test(text)) return "EUR/kg";
  return "EUR/g";
}

function pricePerGram(value = 0, unit = "EUR/g") {
  const parsed = Number(value || 0);
  return unitFromText(unit) === "EUR/kg" ? parsed / 1000 : parsed;
}

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}:${quote.quote_type}`;
}

function formatEvidencePrice(value = 0, unit = "EUR/g") {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
  return `${formatted} ${unitFromText(unit) === "EUR/kg" ? "€/kg" : "€/Gr."}`;
}

function pricePattern() {
  return "([0-9][0-9.,]*)\\s*(?:€|eur|euro)?\\s*(?:\\/\\s*)?(?:gr\\.?|g|grammo|grammi)?";
}

function decimalGramPricePattern() {
  return "([0-9]{1,3}(?:[,.][0-9]{1,3}))\\s*(?:€|eur|euro)?\\s*(?:\\/\\s*)?(?:gr\\.?|g|grammo|grammi)?";
}

function parseProviderTimestamp(text = "") {
  const match = String(text || "").match(/Quotazioni\s+in\s+tempo\s+reale\s+delle\s+([0-9]{2}:[0-9]{2}:[0-9]{2})\s+del\s+([0-9]{2})\/([0-9]{2})\/([0-9]{4})/i);
  if (!match) return { providerTimestamp: null, providerTimestampText: "" };
  const [, time, day, month, year] = match;
  // The source publishes a local clock without a declared timezone or UTC offset.
  // Keep that evidence verbatim; the retrieval instant is the only certain ISO date.
  return {
    providerTimestamp: null,
    providerTimestampText: `Quotazioni in tempo reale delle ${time} del ${day}/${month}/${year}`
  };
}

function gruppoOro24kQuote(definition = {}, price = 0, sourceUrl = GRUPPO_ORO_24K_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const providerTimestamp = options.providerTimestamp || rawPayload.provider_timestamp || null;
  const quoteDate = options.quoteDate || providerTimestamp || new Date().toISOString();
  const evidence = rawPayload.matched_text
    ? compactText(extractReadableTextFromHtml(decodeHtml(rawPayload.matched_text)) || decodeHtml(rawPayload.matched_text)).slice(0, 700)
    : `${definition.label}: ${formatEvidencePrice(price, unit)}`;
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Gruppo Oro 24K",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_gruppo_oro_24k_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: false,
    quote_type: definition.quote_type,
    evidence_text: evidence,
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      gruppo_oro_24k_key: definition.key,
      gruppo_oro_24k_mapping: definition.purity_code,
      gruppo_oro_24k_quote_type: definition.quote_type,
      fineness_per_mille: definition.fineness_per_mille,
      verified_official: true
    }
  };
}

function officialText(value = "") {
  return compactText(extractReadableTextFromHtml(decodeHtml(String(value || "").replace(/<!--[\s\S]*?-->/g, " "))));
}

function verifiedPrice(body = "", options = {}) {
  const text = compactText(body);
  const match = text.match(/^(?:€\s*([+\-−]?[0-9][0-9.,]*)|([+\-−]?[0-9][0-9.,]*)\s*(?:€|EUR\b|euro\b))/i);
  if (!match) return null;
  const raw = match[1] || match[2];
  if (/^[\-−]/.test(raw) || !/^\+?(?:[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{1,3})?|[0-9]+(?:[.,][0-9]{1,3})?)$/.test(raw)) return null;
  const value = parseItalianEuroPrice(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  const tail = text.slice(match[0].length);
  if (/^\s*(?:\$|£|USD\b|GBP\b|CHF\b)/i.test(tail)) return null;
  const unitMatch = tail.match(/^\s*(?:(?:\/|al|per)\s*)?(kg|chilo|chilogramm[oi]|kilo|gramm[oi]|gr\.?|g)\b/i);
  if (!unitMatch && /^\s*(?:\/|al\b|per\b)/i.test(tail)) return null;
  const explicitUnit = unitMatch ? unitFromText(unitMatch[1]) : "";
  const unit = explicitUnit || options.labelUnit || options.defaultUnit || "";
  if (!unit || (options.requireUnit && !explicitUnit && !options.labelUnit)) return null;
  if (options.expectedUnit && unit !== options.expectedUnit) return null;
  if (options.labelUnit && explicitUnit && options.labelUnit !== explicitUnit) return null;
  return { value, unit, evidenceText: text.slice(0, match[0].length + (unitMatch?.[0].length || 0)) };
}

function uniqueVerifiedQuotes(quotes = [], invalidKeys = new Set()) {
  const found = new Map();
  for (const quote of quotes) {
    const key = quoteKey(quote);
    const previous = found.get(key);
    if (previous && Math.abs(previous.price_per_gram - quote.price_per_gram) > 1e-12) invalidKeys.add(key);
    else if (!previous) found.set(key, quote);
  }
  return [...found.entries()].filter(([key]) => !invalidKeys.has(key)).map(([, quote]) => quote);
}

const GRUPPO_ORO_24K_LABEL = /(?:Compro\s+)?(?:ORO\s*[0-9]{1,2}\s*Carati|Argento\s*[0-9]{3})|500\s*Lire\s*Argento|Sterlina\s*Oro|Krugerrand\s*Oro|Marengo\s*Oro/gi;

function definitionForLabel(label = "") {
  const gold = label.match(/ORO\s*([0-9]{1,2})\s*Carati/i);
  const silver = label.match(/Argento\s*([0-9]{3})/i);
  if (!gold && !silver) return null;
  return GRUPPO_ORO_24K_DEFINITIONS.find((definition) => definition.metal === (gold ? "gold" : "silver") && definition.purity_code === (gold ? `${gold[1]}kt` : silver[1]));
}

function parseGruppoOro24kPage(text = "", options = {}) {
  const normalized = officialText(text);
  const timestamp = parseProviderTimestamp(normalized);
  const labels = [...normalized.matchAll(new RegExp(GRUPPO_ORO_24K_LABEL.source, "gi"))];
  const quotes = [];
  const priceCondition = normalized.match(/La\s+quotazione\s+esposta\s+sul\s+sito[^.]{0,350}/i)?.[0] || "";
  const locationCondition = normalized.match(/Solo\s+nel\s+nostro\s+negozio\s+a\s+Milano\s+trovi\s+le\s+quotazioni\s+indicate\s+qui\s+a\s+fianco[.!]?/i)?.[0] || "";
  const conditions = [priceCondition, locationCondition].filter(Boolean).join(" · ");
  const finenessEvidence = normalized.match(/24\s*k(?:t)?\s*\(\s*999\s*\/\s*1000\s*\)/i)?.[0] || "";
  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    let definition = definitionForLabel(label[0]);
    if (!definition) continue;
    const body = normalized.slice(label.index + label[0].length, labels[index + 1]?.index ?? normalized.length).trim().replace(/^[:·]\s*/, "");
    const parsed = verifiedPrice(body, { requireUnit: true, expectedUnit: "EUR/g" });
    if (!parsed) continue;
    if (definition.purity_code === "24kt" && finenessEvidence) definition = { ...definition, purity_value: 0.999, fineness_per_mille: 999 };
    quotes.push(gruppoOro24kQuote(definition, parsed.value, options.sourceUrl || GRUPPO_ORO_24K_DEFAULT_URL, {
      source_method: "official_label_price", matched_text: `${label[0]} ${parsed.evidenceText}`, unit: parsed.unit,
      provider_timestamp: null, provider_timestamp_text: timestamp.providerTimestampText,
      conditions, fineness_evidence: definition.purity_code === "24kt" ? finenessEvidence : ""
    }, { ...options, unit: parsed.unit, providerTimestamp: null }));
  }
  const invalidKeys = new Set();
  return { quotes: uniqueVerifiedQuotes(quotes, invalidKeys), invalidKeys };
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 220) {
  const normalized = officialText(text);
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const found = normalized.match(new RegExp(escaped, "i"));
  if (!found) return null;
  let remainder = normalized.slice(found.index + found[0].length, found.index + Math.min(maxDistance, 500));
  const labels = [...remainder.matchAll(new RegExp(GRUPPO_ORO_24K_LABEL.source, "gi"))];
  // An adjacent image alt may repeat the same field label, but never supplies its price.
  if (labels[0]?.index === 1 && definitionForLabel(labels[0][0])?.key === definitionForLabel(found[0])?.key) remainder = remainder.slice(1 + labels[0][0].length);
  const next = remainder.search(new RegExp(GRUPPO_ORO_24K_LABEL.source, "i"));
  const body = (next < 0 ? remainder : remainder.slice(0, next)).trim();
  const parsed = verifiedPrice(body, { requireUnit: true, expectedUnit: "EUR/g" });
  return parsed ? { value: parsed.value, unit: parsed.unit, evidenceText: `${found[0]} ${parsed.evidenceText}` } : null;
}

function dedupeGruppoOro24kQuotes(quotes = [], invalidKeys = new Set()) {
  return uniqueVerifiedQuotes(quotes, invalidKeys);
}

export function extractGruppoOro24kQuotesFromText(text = "", options = {}) {
  return parseGruppoOro24kPage(text, options).quotes;
}

export async function fetchGruppoOro24kPage(url = GRUPPO_ORO_24K_DEFAULT_URL, options = {}) {
  const headersFor = (userAgent) => ({
    Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
    "User-Agent": userAgent
  });
  const request = (userAgent) => safeExternalFetch(url, {
    allowedHosts: GRUPPO_ORO_24K_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || GRUPPO_ORO_24K_HTML_MAX_BYTES), GRUPPO_ORO_24K_HTML_MAX_BYTES),
    maxRedirects: 3,
    allowedContentTypes: ["text/html", "application/xhtml+xml", "application/json", "text/plain"],
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    headers: headersFor(userAgent)
  });
  const configuredUserAgent = options.userAgent || "OroActiveBot/1.0";
  let response = await request(configuredUserAgent);
  if (response.status === 403 && configuredUserAgent !== GRUPPO_ORO_24K_BROWSER_USER_AGENT) {
    response = await request(GRUPPO_ORO_24K_BROWSER_USER_AGENT);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return {
    url: response.url || url,
    html,
    text: officialText(html),
    method: "safe_external_fetch"
  };
}

function requiredMissingDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.gruppo_oro_24k_key).filter(Boolean));
  return GRUPPO_ORO_24K_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}



export function createGruppoOro24kExtractor(options = {}) {
  const config = {
    url: options.url || GRUPPO_ORO_24K_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || GRUPPO_ORO_24K_HTML_MAX_BYTES), GRUPPO_ORO_24K_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractGruppoOro24kQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      pages.push(await fetchGruppoOro24kPage(runtime.url, runtime));
    } catch (error) {
      warnings.push(`Homepage Gruppo Oro 24K non leggibile: ${error.message || "errore fetch"}`);
    }

    const quoteDate = runtime.quoteDate || new Date().toISOString();
    const analyses = pages.map((page) => parseGruppoOro24kPage(page.text, { ...runtime, quoteDate, sourceUrl: page.url || runtime.url }));
    const invalidKeys = new Set(analyses.flatMap((page) => [...page.invalidKeys]));
    const quotes = dedupeGruppoOro24kQuotes(analyses.flatMap((page) => page.quotes), invalidKeys);
    const missingFields = requiredMissingDefinitions(quotes).map((definition) => ({
      field_key: definition.key, metal: definition.metal, purity_code: definition.purity_code, quote_type: definition.quote_type,
      error: `${definition.label}: nessun prezzo ufficiale univoco in EUR/g verificabile.`
    }));

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Gruppo Oro 24K non rilevato automaticamente.`);
    }

    const requiredCount = GRUPPO_ORO_24K_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "gruppo_oro_24k",
      verified_only: true,
      missing_fields: missingFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.concat(missingFields.map((field) => field.error)).filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractGruppoOro24kQuotes };
}

export async function extractGruppoOro24kQuotes(options = {}) {
  return createGruppoOro24kExtractor(options).extractGruppoOro24kQuotes(options);
}
