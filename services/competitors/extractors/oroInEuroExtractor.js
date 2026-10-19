import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const ORO_IN_EURO_DEFAULT_URL = "https://www.quotazioneritirooro.it";
const ORO_IN_EURO_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const ORO_IN_EURO_ALLOWED_HOSTS = ["quotazioneritirooro.it"];
const ORO_IN_EURO_HTML_MAX_BYTES = 2 * 1024 * 1024;

const ORO_IN_EURO_DEFINITIONS = [
  {
    key: "oro_in_euro_gold_18kt",
    label: "Oro 750/1000",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    fineness_per_mille: 750,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Oro 750/1000",
    defaultUnit: "EUR/g"
  },
  {
    key: "oro_in_euro_gold_24kt",
    label: "Oro 999/1000",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 0.999,
    fineness_per_mille: 999,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Oro 999/1000",
    defaultUnit: "EUR/g"
  },
  {
    key: "oro_in_euro_silver_999",
    label: "Argento 999/1000",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    fineness_per_mille: 999,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Argento 999/1000",
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

function formatEvidencePrice(value = 0, unit = "EUR/g") {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
  return `${formatted} ${unitFromText(unit) === "EUR/kg" ? "€/kg" : "€/Grammo"}`;
}

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}:${quote.quote_type}`;
}

function pricePattern() {
  return "([0-9][0-9.,]*)\\s*(?:€|eur|euro)?\\s*(?:\\/\\s*)?(?:Grammo|grammo|grammi|g|gr)?";
}

function currencyPriceRegex() {
  return /(?:€\s*([0-9][0-9.,]*)|([0-9][0-9.,]*)\s*(?:€|eur|euro)\s*(?:\/\s*)?(?:Grammo|grammo|grammi|g|gr)?|([0-9][0-9.,]*)\s*(?:\/\s*)?(?:Grammo|grammo|grammi|g|gr))/i;
}

function oroInEuroEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  return `${definition.label}: ${formatEvidencePrice(price, unit)}`;
}

function oroInEuroQuote(definition = {}, price = 0, sourceUrl = ORO_IN_EURO_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Oro in Euro",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_oro_in_euro_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: false,
    quote_type: definition.quote_type,
    evidence_text: oroInEuroEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      oro_in_euro_key: definition.key,
      oro_in_euro_mapping: definition.purity_code,
      oro_in_euro_quote_type: definition.quote_type,
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

const ORO_IN_EURO_LABEL = /(?:Oro|Argento)\s*[0-9]{3}\s*\/\s*1000|(?:AU|AG)\.[0-9]{3}/gi;

function definitionForLabel(label = "") {
  const fineness = label.match(/([0-9]{3})/)?.[1];
  const metal = /^(?:Argento|AG)/i.test(label) ? "silver" : "gold";
  return ORO_IN_EURO_DEFINITIONS.find((definition) => definition.metal === metal && String(definition.fineness_per_mille) === fineness);
}

function parseOroInEuroPage(text = "", options = {}) {
  const normalized = officialText(text);
  const labels = [...normalized.matchAll(new RegExp(ORO_IN_EURO_LABEL.source, "gi"))];
  const quotes = [];
  const conditions = normalized.match(/Ricevila\s+direttamente[^!\.]{0,400}/i)?.[0] || "";
  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    const definition = definitionForLabel(label[0]);
    if (!definition) continue;
    const body = normalized.slice(label.index + label[0].length, labels[index + 1]?.index ?? normalized.length).trim().replace(/^[:·]\s*/, "");
    const parsed = verifiedPrice(body, { requireUnit: true, expectedUnit: "EUR/g" });
    if (!parsed) continue;
    quotes.push(oroInEuroQuote(definition, parsed.value, options.sourceUrl || ORO_IN_EURO_DEFAULT_URL, {
      source_method: "official_label_price", matched_text: `${label[0]} ${parsed.evidenceText}`, unit: parsed.unit, conditions
    }, { ...options, unit: parsed.unit }));
  }
  const invalidKeys = new Set();
  return { quotes: uniqueVerifiedQuotes(quotes, invalidKeys), invalidKeys };
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 240) {
  const normalized = officialText(text);
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const found = normalized.match(new RegExp(escaped, "i"));
  if (!found) return null;
  const remainder = normalized.slice(found.index + found[0].length, found.index + Math.min(maxDistance, 500));
  const next = remainder.search(new RegExp(ORO_IN_EURO_LABEL.source, "i"));
  const body = (next < 0 ? remainder : remainder.slice(0, next)).trim();
  const parsed = verifiedPrice(body, { requireUnit: true, expectedUnit: "EUR/g" });
  return parsed ? { value: parsed.value, evidenceText: `${found[0]} ${parsed.evidenceText}` } : null;
}

export function extractOroInEuroQuotesFromText(text = "", options = {}) {
  return parseOroInEuroPage(text, options).quotes;
}

function dedupeOroInEuroQuotes(quotes = [], invalidKeys = new Set()) {
  return uniqueVerifiedQuotes(quotes, invalidKeys);
}

export async function fetchOroInEuroPage(url = ORO_IN_EURO_DEFAULT_URL, options = {}) {
  const requestHeaders = (userAgent) => ({
    Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
    "User-Agent": userAgent
  });
  const request = (userAgent) => safeExternalFetch(url, {
    allowedHosts: ORO_IN_EURO_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || ORO_IN_EURO_HTML_MAX_BYTES), ORO_IN_EURO_HTML_MAX_BYTES),
    maxRedirects: 3,
    allowedContentTypes: ["text/html", "application/xhtml+xml", "application/json", "text/plain"],
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    headers: requestHeaders(userAgent)
  });
  const configuredUserAgent = options.userAgent || "OroActiveBot/1.0";
  let response = await request(configuredUserAgent);
  if (response.status === 403 && configuredUserAgent !== ORO_IN_EURO_BROWSER_USER_AGENT) {
    response = await request(ORO_IN_EURO_BROWSER_USER_AGENT);
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

function resolveOroInEuroUrl(href = "", baseUrl = ORO_IN_EURO_DEFAULT_URL) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    if (!/(\.|^)quotazioneritirooro\.it$/i.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function discoverOroInEuroQuoteUrls(html = "", baseUrl = ORO_IN_EURO_DEFAULT_URL) {
  const urls = [baseUrl];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = linkRegex.exec(String(html || "")))) {
    const href = match[1] || "";
    const label = extractReadableTextFromHtml(match[2] || "");
    if (!/(quotazione|ritiro\s*oro|oro\s*usato|compro\s*oro|argento|valutazione)/i.test(`${href} ${label}`)) continue;
    const resolved = resolveOroInEuroUrl(href, baseUrl);
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls.map((url) => resolveOroInEuroUrl(url, baseUrl)).filter(Boolean))].slice(0, 5);
}

function requiredMissingDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.oro_in_euro_key).filter(Boolean));
  return ORO_IN_EURO_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}



export function createOroInEuroExtractor(options = {}) {
  const config = {
    url: options.url || ORO_IN_EURO_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || ORO_IN_EURO_HTML_MAX_BYTES), ORO_IN_EURO_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractOroInEuroQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchOroInEuroPage(runtime.url, runtime);
      pages.push(homepage);

    } catch (error) {
      warnings.push(`Homepage Oro in Euro non leggibile: ${error.message || "errore fetch"}`);
    }

    const quoteDate = runtime.quoteDate || new Date().toISOString();
    const analyses = pages.map((page) => parseOroInEuroPage(page.text, { ...runtime, quoteDate, sourceUrl: page.url || runtime.url }));
    const invalidKeys = new Set(analyses.flatMap((page) => [...page.invalidKeys]));
    const quotes = dedupeOroInEuroQuotes(analyses.flatMap((page) => page.quotes), invalidKeys);
    const missingFields = requiredMissingDefinitions(quotes).map((definition) => ({
      field_key: definition.key, metal: definition.metal, purity_code: definition.purity_code, quote_type: definition.quote_type,
      error: `${definition.label}: nessun prezzo ufficiale univoco in EUR/g verificabile.`
    }));

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Oro in Euro non rilevato automaticamente.`);
    }

    const requiredCount = ORO_IN_EURO_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "oro_in_euro",
      verified_only: true,
      missing_fields: missingFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.concat(missingFields.map((field) => field.error)).filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractOroInEuroQuotes };
}

export async function extractOroInEuroQuotes(options = {}) {
  return createOroInEuroExtractor(options).extractOroInEuroQuotes(options);
}
