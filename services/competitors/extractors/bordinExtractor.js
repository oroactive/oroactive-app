import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const BORDIN_DEFAULT_URL = "https://oroemetallipreziosi.com";
const BORDIN_ALLOWED_HOSTS = new Set([
  "oroemetallipreziosi.com",
  "www.oroemetallipreziosi.com",
  "orometallipreziosi.com",
  "www.orometallipreziosi.com"
]);
const BORDIN_HTML_MAX_BYTES = 2 * 1024 * 1024;

const BORDIN_DEFINITIONS = [
  {
    key: "bordin_gold_24kt",
    label: "Oro 24kt - 999,9‰",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 0.9999,
    fineness_per_mille: 999.9,
    required: true,
    anchor: "Oro 24kt"
  },
  {
    key: "bordin_gold_18kt",
    label: "Oro 18kt - 750‰",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    fineness_per_mille: 750,
    required: true,
    anchor: "Oro 18kt"
  },
  {
    key: "bordin_gold_14kt",
    label: "Oro 14kt - 585‰",
    metal: "gold",
    purity_code: "14kt",
    purity_value: 0.585,
    fineness_per_mille: 585,
    required: true,
    anchor: "Oro 14kt"
  },
  {
    key: "bordin_silver_999",
    label: "Argento 999",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    fineness_per_mille: 999,
    required: true,
    anchor: "Argento 999"
  },
  {
    key: "bordin_silver_925",
    label: "Argento 925",
    metal: "silver",
    purity_code: "925",
    purity_value: 0.925,
    fineness_per_mille: 925,
    required: true,
    anchor: "Argento 925"
  },
  {
    key: "bordin_silver_800",
    label: "Argento 800",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    fineness_per_mille: 800,
    required: true,
    anchor: "Argento 800"
  }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function officialText(value = "") {
  return compactText(extractReadableTextFromHtml(decodeHtml(String(value || "").replace(/<!--[\s\S]*?-->/g, " "))));
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&permil;/gi, "‰")
    .replace(/&#8240;/gi, "‰")
    .replace(/&#x2030;/gi, "‰")
    .replace(/&amp;/gi, "&")
    .replace(/&#038;/gi, "&")
    .replace(/&#39;/gi, "'")
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

function unitFromText(value = "") {
  const text = String(value || "").toLowerCase();
  if (/kg|chilogram|kilo/.test(text)) return "EUR/kg";
  return "EUR/g";
}

function pricePerGram(value = 0, unit = "EUR/g") {
  const parsed = Number(value || 0);
  return unitFromText(unit) === "EUR/kg" ? parsed / 1000 : parsed;
}

function formatEvidencePrice(value = 0, unit = "EUR/g") {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
  return `${formatted} ${unitFromText(unit) === "EUR/kg" ? "€/kg" : "€/g"}`;
}

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}`;
}

function parseProviderTimestamp(text = "") {
  const match = String(text || "").match(/Quotazione\s+aggiornata\s+il\s+([0-9]{2})-([0-9]{2})-([0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/i);
  if (!match) return { providerTimestamp: null, providerTimestampText: "" };
  const [, day, month, year, time] = match;
  return {
    providerTimestamp: null,
    providerTimestampText: `${day}-${month}-${year} ${time}`
  };
}

function extractCondition(text = "") {
  const match = String(text || "").match(/Offerta\s+valida\s+per\s+quantitativi\s+superiori\s+a\s+([0-9]+)\s*grammi?\.?/i);
  if (!match) return { conditionText: "", minQuantityGrams: null };
  return {
    conditionText: compactText(match[0]),
    minQuantityGrams: Number(match[1] || 0) || null
  };
}

function canonicalBordinUrl(url = BORDIN_DEFAULT_URL) {
  try {
    const parsed = new URL(String(url || BORDIN_DEFAULT_URL));
    if (/^www\.?orometallipreziosi\.com$/i.test(parsed.hostname) || /^orometallipreziosi\.com$/i.test(parsed.hostname)) {
      parsed.hostname = "oroemetallipreziosi.com";
    }
    if (parsed.hostname === "www.oroemetallipreziosi.com") parsed.hostname = "oroemetallipreziosi.com";
    return parsed.toString();
  } catch {
    return BORDIN_DEFAULT_URL;
  }
}

function textSection(text = "", startPattern, endPattern = null) {
  const source = String(text || "");
  const startMatch = source.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return "";
  const start = startMatch.index;
  const rest = source.slice(start);
  if (!endPattern) return rest;
  const endMatch = rest.slice(Math.max(startMatch[0].length, 1)).match(endPattern);
  if (!endMatch || endMatch.index === undefined) return rest;
  return rest.slice(0, Math.max(startMatch[0].length, 1) + endMatch.index);
}

function sectionOptionsForDefinition(definition = {}, normalizedText = "", baseOptions = {}) {
  const section = definition.metal === "silver"
    ? textSection(normalizedText, /Quotazione\s+Argento/i, /Quotazione\s+(?:Oro|Argento)\b/i)
    : textSection(normalizedText, /Quotazione\s+Oro/i, /Quotazione\s+(?:Oro|Argento)\b/i);
  const timestamp = parseProviderTimestamp(section);
  const condition = extractCondition(section);
  return {
    ...baseOptions,
    providerTimestamp: timestamp.providerTimestamp,
    providerTimestampText: timestamp.providerTimestampText,
    conditionText: condition.conditionText,
    minQuantityGrams: condition.minQuantityGrams
  };
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 240) {
  const source = officialText(text);
  const start = source.toLowerCase().indexOf(String(anchor || "").toLowerCase());
  if (start < 0 || !anchor) return null;
  const quotes = extractBordinQuotesFromText(source.slice(start, start + maxDistance));
  const quote = quotes.find((item) => item.evidence_text.toLowerCase().startsWith(String(anchor).toLowerCase()));
  return quote ? { value: quote.price_per_gram, unit: "EUR/g", evidenceText: quote.evidence_text } : null;
}

function bordinQuote(definition = {}, price = 0, sourceUrl = BORDIN_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const providerTimestamp = options.providerTimestamp || rawPayload.provider_timestamp || null;
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Bordin",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_bordin_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: false,
    quote_type: "customer_buyback",
    evidence_text: rawPayload.matched_text
      ? compactText(rawPayload.matched_text).slice(0, 700)
      : `${definition.label}: ${formatEvidencePrice(price, unit)}`,
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      verified_official: true,
      bordin_key: definition.key,
      bordin_mapping: definition.purity_code,
      fineness_per_mille: definition.fineness_per_mille,
      provider_timestamp: providerTimestamp,
      provider_timestamp_text: options.providerTimestampText || rawPayload.provider_timestamp_text || "",
      condition: options.conditionText || rawPayload.condition_text || "",
      condition_text: options.conditionText || rawPayload.condition_text || "",
      min_quantity_grams: options.minQuantityGrams ?? rawPayload.min_quantity_grams ?? null
    }
  };
}

export function extractBordinQuotesFromText(text = "", options = {}) {
  const sourceUrl = canonicalBordinUrl(options.sourceUrl || BORDIN_DEFAULT_URL);
  const normalized = officialText(text);
  const labels = [...normalized.matchAll(/\b(?:Oro\s*(\d{1,2})\s*(?:kt|k)\b|Argento\s*(\d{3})\b)/gi)];
  const quotes = [];
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const metal = label[1] ? "gold" : "silver";
    const code = label[1] ? `${label[1]}kt` : label[2];
    const definition = BORDIN_DEFINITIONS.find((item) => item.metal === metal && item.purity_code === code);
    if (!definition) continue;
    let segment = normalized.slice(label.index + label[0].length, labels[index + 1]?.index ?? normalized.length);
    let finenessText = "";
    if (metal === "gold") {
      const fineness = segment.match(/^\s*[-–:]?\s*(\d+(?:[.,]\d+)?)\s*(?:‰|per\s*mille|\/\s*1000)/i);
      if (fineness) {
        if (Number(fineness[1].replace(",", ".")) !== definition.fineness_per_mille) continue;
        finenessText = fineness[0];
        segment = segment.slice(fineness[0].length);
      }
    } else {
      const fineness = segment.match(/^\s*(?:‰|per\s*mille|\/\s*1000)/i);
      if (fineness) {
        finenessText = fineness[0];
        segment = segment.slice(fineness[0].length);
      }
    }
    const match = segment.match(/^\s*[:=·]?\s*([0-9][0-9.,]*)\s*(?:€|EUR|euro)\s*\/\s*(grammi|grammo|gr|g)\b/i);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!Number.isFinite(price) || price <= 0) continue;
    const definitionOptions = sectionOptionsForDefinition(definition, normalized, options);
    quotes.push(bordinQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: `${label[0]}${finenessText}${match[0]}`,
      unit: "EUR/g"
    }, { ...definitionOptions, unit: "EUR/g" }));
  }
  return dedupeBordinQuotes(quotes);
}

function dedupeBordinQuotes(quotes = []) {
  const map = new Map();
  const conflicts = new Set();
  for (const quote of quotes) {
    const key = quoteKey(quote);
    if (map.has(key) && map.get(key).price_per_gram !== quote.price_per_gram) conflicts.add(key);
    else map.set(key, quote);
  }
  return [...map.entries()].filter(([key]) => !conflicts.has(key)).map(([, quote]) => quote);
}

export async function fetchBordinPage(url = BORDIN_DEFAULT_URL, options = {}) {
  const targetUrl = canonicalBordinUrl(url);
  const response = await safeExternalFetch(targetUrl, {
    allowedHosts: [...BORDIN_ALLOWED_HOSTS],
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || BORDIN_HTML_MAX_BYTES), BORDIN_HTML_MAX_BYTES),
    maxRedirects: 3,
    allowedContentTypes: ["text/html", "application/xhtml+xml", "application/json", "text/plain"],
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
      "User-Agent": options.userAgent || "OroActiveBot/1.0"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return {
    url: canonicalBordinUrl(response.url || targetUrl),
    html,
    text: officialText(html),
    method: "safe_external_fetch"
  };
}

function resolveBordinUrl(href = "", baseUrl = BORDIN_DEFAULT_URL) {
  try {
    const url = new URL(decodeHtml(href), canonicalBordinUrl(baseUrl));
    if (!BORDIN_ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return "";
    return canonicalBordinUrl(url.toString());
  } catch {
    return "";
  }
}

export function discoverBordinQuoteUrls(html = "", baseUrl = BORDIN_DEFAULT_URL) {
  const urls = [baseUrl];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = linkRegex.exec(String(html || "")))) {
    const href = match[1] || "";
    const label = extractReadableTextFromHtml(match[2] || "");
    if (!/(quotazione|oro|compro\s*oro|metalli\s*preziosi)/i.test(`${href} ${label}`)) continue;
    const resolved = resolveBordinUrl(href, baseUrl);
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls.map((url) => resolveBordinUrl(url, baseUrl)).filter(Boolean))].slice(0, 5);
}

function requiredMissingDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.bordin_key).filter(Boolean));
  return BORDIN_DEFINITIONS.filter((definition) => !found.has(definition.key));
}

export function createBordinExtractor(options = {}) {
  const config = {
    url: canonicalBordinUrl(options.url || BORDIN_DEFAULT_URL),
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || BORDIN_HTML_MAX_BYTES), BORDIN_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractBordinQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchBordinPage(runtime.url, runtime);
      pages.push(homepage);
    } catch (error) {
      warnings.push(`Homepage Bordin non leggibile: ${error.message || "errore fetch"}`);
    }

    const quotes = dedupeBordinQuotes(pages.flatMap((page) => extractBordinQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    })));

    const missingFields = requiredMissingDefinitions(quotes).map((definition) => ({
      field_key: definition.key,
      metal: definition.metal,
      purity_code: definition.purity_code,
      quote_type: "customer_buyback",
      error: `${definition.label}: nessun prezzo verificabile nella fonte ufficiale. Nessuna stima utilizzata.`
    }));
    warnings.push(...missingFields.map((field) => field.error));
    const status = missingFields.length === 0 ? "success" : quotes.length ? "partial" : "failed";
    return {
      source: "bordin",
      verified_only: true,
      missing_fields: missingFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractBordinQuotes };
}

export async function extractBordinQuotes(options = {}) {
  return createBordinExtractor(options).extractBordinQuotes(options);
}
