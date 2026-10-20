import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const GOLD_STANDARD_DEFAULT_URL = "https://www.goldstandard.gold";
const GOLD_STANDARD_GOLD_UNIT_URL = "https://www.goldstandard.gold/da-gioiello-a-denaro-il-processo-di-valutazione-delloro/";
const GOLD_STANDARD_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const GOLD_STANDARD_ALLOWED_HOSTS = ["goldstandard.gold"];
const GOLD_STANDARD_HTML_MAX_BYTES = 2 * 1024 * 1024;

const GOLD_STANDARD_DEFINITIONS = [
  {
    key: "gold_standard_gold_24kt_reference",
    label: "Quotazione dell'oro in borsa",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "reference_market_gold_price",
    required: true,
    anchor: "Quotazione dell'oro in borsa",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_standard_gold_18kt_buyback",
    label: "Acquistiamo ORO 18K prezzo MIN",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Acquistiamo ORO 18K",
    price_kind: "min_price",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_standard_gold_24kt_buyback",
    label: "Acquistiamo ORO 24K al prezzo MIN",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Acquistiamo ORO 24K",
    price_kind: "min_price",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_standard_silver_reference",
    label: "Quotazione dell'argento in borsa",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    quote_type: "reference_market_silver_price",
    required: true,
    anchor: "Quotazione dell'argento in borsa",
    defaultUnit: "EUR/kg"
  },
  {
    key: "gold_standard_silver_925_buyback",
    label: "Acquistiamo ARGENTO 925 al chilo",
    metal: "silver",
    purity_code: "925",
    purity_value: 0.925,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Acquistiamo ARGENTO 925",
    price_kind: "min_price",
    defaultUnit: "EUR/kg"
  },
  {
    key: "gold_standard_silver_800_buyback",
    label: "Acquistiamo ARGENTO 800 al chilo",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Acquistiamo ARGENTO 800",
    price_kind: "min_price",
    defaultUnit: "EUR/kg"
  }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&egrave;|&#0*232;|&#x0*e8;/gi, "è")
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
  return `${formatted} ${unitFromText(unit) === "EUR/kg" ? "€/kg" : "€/g"}`;
}

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}:${quote.quote_type}`;
}

function pricePattern() {
  return "(?:€\\s*)?([0-9][0-9.,]*)\\s*(?:€|eur|euro)?";
}

function currencyPriceRegex() {
  return /(?:€\s*([0-9][0-9.,]*)|([0-9][0-9.,]*)\s*(?:€|eur|euro))/i;
}

function goldStandardEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  return `${definition.label}: ${formatEvidencePrice(price, unit)}`;
}

function goldStandardQuote(definition = {}, price = 0, sourceUrl = GOLD_STANDARD_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Gold Standard",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_gold_standard_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: false,
    quote_type: definition.quote_type,
    evidence_text: goldStandardEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      gold_standard_key: definition.key,
      gold_standard_mapping: definition.purity_code,
      gold_standard_quote_type: definition.quote_type,
      price_kind: definition.price_kind || rawPayload.price_kind || null,
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
  return { value, unit, explicitUnit, evidenceText: text.slice(0, match[0].length + (unitMatch?.[0].length || 0)) };
}

function verifiedGoldUnitEvidence(evidence = null) {
  if (evidence?.unit !== "EUR/g" || !evidence.source_url || !evidence.text) return null;
  try {
    const url = new URL(evidence.source_url);
    if (url.protocol !== "https:" || !/^(?:www\.)?goldstandard\.gold$/i.test(url.hostname)
      || !/^\/da-gioiello-a-denaro-il-processo-di-valutazione-delloro\/?$/.test(url.pathname)) return null;
    const text = officialText(evidence.text);
    if (!/quotazione\s+dell[’']oro\b[\s\S]{0,400}?\beuro\s+per\s+grammo\b/i.test(text)) return null;
    return { unit: "EUR/g", source_url: url.toString(), text };
  } catch {
    return null;
  }
}

function goldUnitEvidenceFromPage(page = {}) {
  const text = page.text?.match(/L[’']altro\s+elemento\s+essenziale\s+[èe]\s+la\s+quotazione\s+dell[’']oro\b[\s\S]{0,400}?\beuro\s+per\s+grammo\b[.!?]?/i)?.[0];
  return text ? verifiedGoldUnitEvidence({ unit: "EUR/g", source_url: page.url, text }) : null;
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

const GOLD_STANDARD_LABEL = /Quotazione\s+dell[’']\s*(?:oro|argento)\s+in\s+borsa|Acquistiamo\s+(?:ORO\s*[0-9]{1,2}\s*K(?:T)?|ARGENTO\s*[0-9]{3})/gi;

function definitionForLabel(label = "") {
  const normalized = compactText(label).toLowerCase();
  if (/quotazione/.test(normalized)) return GOLD_STANDARD_DEFINITIONS.find((definition) => definition.key === (/argento/.test(normalized) ? "gold_standard_silver_reference" : "gold_standard_gold_24kt_reference"));
  const gold = normalized.match(/oro\s*([0-9]{1,2})\s*k/);
  const silver = normalized.match(/argento\s*([0-9]{3})/);
  return GOLD_STANDARD_DEFINITIONS.find((definition) => definition.quote_type === "customer_buyback" && definition.metal === (gold ? "gold" : "silver") && definition.purity_code === (gold ? `${gold[1]}kt` : silver?.[1]));
}

function parseGoldStandardPage(text = "", options = {}) {
  const normalized = officialText(text);
  const labels = [...normalized.matchAll(new RegExp(GOLD_STANDARD_LABEL.source, "gi"))];
  const quotes = [];
  const goldUnitEvidence = verifiedGoldUnitEvidence(options.goldUnitEvidence);
  let needsGoldUnitEvidence = false;
  const conditions = normalized.match(/La\s+quotazione\s+indica\s+[^.]{0,700}/i)?.[0] || "";
  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    const definition = definitionForLabel(label[0]);
    if (!definition) continue;
    let body = normalized.slice(label.index + label[0].length, labels[index + 1]?.index ?? normalized.length).trim();
    let labelUnit = "";
    if (definition.metal === "gold" && definition.quote_type === "customer_buyback") {
      const minimum = body.match(/^(?:al\s+)?prezzo\s*(?:MIN(?:IMO)?)\b\s*[:·]?\s*/i);
      if (!minimum) continue;
      body = body.slice(minimum[0].length);
    }
    if (definition.metal === "silver" && definition.quote_type === "customer_buyback") {
      const kilogram = body.match(/^al\s+(?:chilo|chilogrammo|kg)\b\s*[:·]?\s*/i);
      if (!kilogram) continue;
      labelUnit = "EUR/kg";
      body = body.slice(kilogram[0].length);
    }
    const parsed = verifiedPrice(body.replace(/^[:·]\s*/, ""), {
      labelUnit: labelUnit || (definition.metal === "gold" ? goldUnitEvidence?.unit : ""),
      expectedUnit: definition.metal === "gold" ? "EUR/g" : "",
      requireUnit: true
    });
    if (!parsed) {
      if (definition.metal === "gold" && !goldUnitEvidence
        && /^(?:€\s*\+?[0-9][0-9.,]*|\+?[0-9][0-9.,]*\s*(?:€|EUR|euro))\s*$/i.test(body)) needsGoldUnitEvidence = true;
      continue;
    }
    const unitEvidence = definition.metal === "gold" && !parsed.explicitUnit
      ? goldUnitEvidence
      : { unit: parsed.unit, source_url: options.sourceUrl || GOLD_STANDARD_DEFAULT_URL, text: labelUnit ? `${label[0]} al chilo` : `${label[0]} ${parsed.evidenceText}` };
    quotes.push(goldStandardQuote(definition, parsed.value, options.sourceUrl || GOLD_STANDARD_DEFAULT_URL, {
      source_method: "official_label_price", matched_text: `${label[0]} ${body}`, unit: parsed.unit,
      conditions, unit_evidence: unitEvidence
    }, { ...options, unit: parsed.unit }));
  }
  const invalidKeys = new Set();
  return { quotes: uniqueVerifiedQuotes(quotes, invalidKeys), invalidKeys, needsGoldUnitEvidence };
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 240) {
  const normalized = officialText(text);
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*").replace(/'/g, "[’']");
  const found = normalized.match(new RegExp(escaped, "i"));
  if (!found) return null;
  const remainder = normalized.slice(found.index + found[0].length, found.index + Math.min(maxDistance, 500));
  const next = remainder.search(new RegExp(GOLD_STANDARD_LABEL.source, "i"));
  let body = next < 0 ? remainder : remainder.slice(0, next);
  const labelUnit = /al\s+chilo/i.test(body) ? "EUR/kg" : "";
  body = body.replace(/^\s*(?:(?:al\s+)?prezzo\s*MIN(?:IMO)?|al\s+chilo)\s*[:·]?\s*/i, "");
  const definition = definitionForLabel(found[0]);
  const parsed = verifiedPrice(body, { labelUnit, requireUnit: true, expectedUnit: definition?.metal === "gold" ? "EUR/g" : "" });
  return parsed ? { value: parsed.value, evidenceText: `${found[0]} ${parsed.evidenceText}` } : null;
}

export function extractGoldStandardQuotesFromText(text = "", options = {}) {
  return parseGoldStandardPage(text, options).quotes;
}

function dedupeGoldStandardQuotes(quotes = [], invalidKeys = new Set()) {
  return uniqueVerifiedQuotes(quotes, invalidKeys);
}

export async function fetchGoldStandardPage(url = GOLD_STANDARD_DEFAULT_URL, options = {}) {
  const requestHeaders = (userAgent) => ({
    Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
    "User-Agent": userAgent
  });
  const request = (userAgent) => safeExternalFetch(url, {
    allowedHosts: GOLD_STANDARD_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || GOLD_STANDARD_HTML_MAX_BYTES), GOLD_STANDARD_HTML_MAX_BYTES),
    maxRedirects: 3,
    allowedContentTypes: ["text/html", "application/xhtml+xml", "application/json", "text/plain"],
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    headers: requestHeaders(userAgent)
  });
  const configuredUserAgent = options.userAgent || "OroActiveBot/1.0";
  let response = await request(configuredUserAgent);
  if (response.status === 403 && configuredUserAgent !== GOLD_STANDARD_BROWSER_USER_AGENT) {
    response = await request(GOLD_STANDARD_BROWSER_USER_AGENT);
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

function resolveGoldStandardUrl(href = "", baseUrl = GOLD_STANDARD_DEFAULT_URL) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    if (!/(\.|^)goldstandard\.gold$/i.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function discoverGoldStandardQuoteUrls(html = "", baseUrl = GOLD_STANDARD_DEFAULT_URL) {
  const urls = [baseUrl];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = linkRegex.exec(String(html || "")))) {
    const href = match[1] || "";
    const label = extractReadableTextFromHtml(match[2] || "");
    if (!/(quotazione|oro\s*usato|compro\s*oro|oro)/i.test(`${href} ${label}`)) continue;
    const resolved = resolveGoldStandardUrl(href, baseUrl);
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls.map((url) => resolveGoldStandardUrl(url, baseUrl)).filter(Boolean))].slice(0, 5);
}

function requiredMissingDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.gold_standard_key).filter(Boolean));
  return GOLD_STANDARD_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}



export function createGoldStandardExtractor(options = {}) {
  const config = {
    url: options.url || GOLD_STANDARD_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || GOLD_STANDARD_HTML_MAX_BYTES), GOLD_STANDARD_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractGoldStandardQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchGoldStandardPage(runtime.url, runtime);
      pages.push(homepage);

    } catch (error) {
      warnings.push(`Homepage Gold Standard non leggibile: ${error.message || "errore fetch"}`);
    }

    const quoteDate = runtime.quoteDate || new Date().toISOString();
    const preliminary = pages.map((page) => parseGoldStandardPage(page.text, { ...runtime, goldUnitEvidence: null, quoteDate, sourceUrl: page.url || runtime.url }));
    let goldUnitEvidence = null;
    let unitEvidencePage = null;
    if (preliminary.some((page) => page.needsGoldUnitEvidence)) {
      unitEvidencePage = pages.find((page) => page.url === GOLD_STANDARD_GOLD_UNIT_URL)
        || await fetchGoldStandardPage(GOLD_STANDARD_GOLD_UNIT_URL, runtime).catch((error) => {
          warnings.push(`Unità ufficiale Gold Standard non leggibile: ${error.message || "errore fetch"}`);
          return null;
        });
      goldUnitEvidence = goldUnitEvidenceFromPage(unitEvidencePage || {});
      if (!goldUnitEvidence) warnings.push("Unità dell'oro non verificabile nella dichiarazione ufficiale Gold Standard. Nessuna unità dedotta dai prezzi.");
    }
    const analyses = pages.map((page) => parseGoldStandardPage(page.text, { ...runtime, goldUnitEvidence, quoteDate, sourceUrl: page.url || runtime.url }));
    const invalidKeys = new Set(analyses.flatMap((page) => [...page.invalidKeys]));
    const quotes = dedupeGoldStandardQuotes(analyses.flatMap((page) => page.quotes), invalidKeys);
    const missingFields = requiredMissingDefinitions(quotes).map((definition) => ({
      field_key: definition.key, metal: definition.metal, purity_code: definition.purity_code, quote_type: definition.quote_type,
      error: definition.key === "gold_standard_silver_reference"
        ? "Quotazione argento in borsa: prezzo o unità ufficiale non verificabile. Nessuna unità dedotta dal valore numerico."
        : `${definition.label}: nessun prezzo ufficiale univoco verificabile.`
    }));

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Gold Standard non rilevato automaticamente.`);
    }

    const requiredCount = GOLD_STANDARD_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "gold_standard",
      verified_only: true,
      missing_fields: missingFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.concat(missingFields.map((field) => field.error)).filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: [...new Set(pages.map((page) => page.url).concat(unitEvidencePage?.url || []))]
    };
  }

  return { extractGoldStandardQuotes };
}

export async function extractGoldStandardQuotes(options = {}) {
  return createGoldStandardExtractor(options).extractGoldStandardQuotes(options);
}
