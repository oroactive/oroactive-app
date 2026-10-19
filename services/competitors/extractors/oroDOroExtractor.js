import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const ORO_DORO_DEFAULT_URL = "https://comproorodoro.it";
const ORO_DORO_ALLOWED_HOSTS = ["comproorodoro.it"];
const ORO_DORO_HTML_MAX_BYTES = 2 * 1024 * 1024;

const ORO_DORO_DEFINITIONS = [
  { key: "oro_doro_gold_24kt", label: "ORO 24kt", metal: "gold", purity_code: "24kt", purity_value: 1, token: "24" },
  { key: "oro_doro_gold_22kt", label: "ORO 22kt", metal: "gold", purity_code: "22kt", purity_value: 22 / 24, token: "22" },
  { key: "oro_doro_gold_21kt", label: "ORO 21kt", metal: "gold", purity_code: "21kt", purity_value: 21 / 24, token: "21" },
  { key: "oro_doro_gold_20kt", label: "ORO 20kt", metal: "gold", purity_code: "20kt", purity_value: 20 / 24, token: "20" },
  { key: "oro_doro_gold_18kt", label: "ORO 18kt", metal: "gold", purity_code: "18kt", purity_value: 0.75, token: "18" },
  { key: "oro_doro_gold_14kt", label: "ORO 14kt", metal: "gold", purity_code: "14kt", purity_value: 14 / 24, token: "14" },
  { key: "oro_doro_gold_9kt", label: "ORO 9kt", metal: "gold", purity_code: "9kt", purity_value: 9 / 24, token: "9" },
  { key: "oro_doro_silver_999", label: "ARGENTO 999", metal: "silver", purity_code: "999", purity_value: 0.999, token: "999" },
  { key: "oro_doro_silver_925", label: "ARGENTO 925", metal: "silver", purity_code: "925", purity_value: 0.925, token: "925" },
  { key: "oro_doro_silver_800", label: "ARGENTO 800", metal: "silver", purity_code: "800", purity_value: 0.8, token: "800" }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&#038;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"");
}

export function parseItalianEuroPrice(value = "") {
  const raw = String(value || "").replace(/\u00a0/g, " ").replace(/[^\d,.\s]/g, "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/\s+/g, "");
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

function oroDOroDefinition(key = "") {
  return ORO_DORO_DEFINITIONS.find((item) => item.key === key) || {};
}

function oroDOroQuote(definition = {}, price = 0, sourceUrl = ORO_DORO_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Oro D'Oro",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_oro_doro_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: "customer_buyback",
    evidence_text: rawPayload.matched_text
      ? compactText(rawPayload.matched_text).slice(0, 700)
      : `${definition.label}: ${formatEvidencePrice(price, unit)}`,
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      oro_doro_key: definition.key,
      oro_doro_mapping: definition.purity_code
    }
  };
}

function parseOroDOroQuotePage(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || ORO_DORO_DEFAULT_URL;
  const normalized = compactText(decodeHtml(text));
  // A price belongs only to its own labelled segment, never the next carat.
  const labels = [...normalized.matchAll(/\b(?:ORO\s*(\d{1,2})\s*(?:kt|k)|ARGENTO\s*(\d{3}))\b/gi)];
  const quotes = new Map();
  const conflicts = new Set();
  const publishedKeys = new Set();
  for (const label of labels) {
    const definition = ORO_DORO_DEFINITIONS.find((item) => item.metal === (label[1] ? "gold" : "silver") && item.token === (label[1] || label[2]));
    if (!definition) continue;
    let segment = normalized.slice(label.index + label[0].length, label.index + label[0].length + 110);
    const boundary = segment.search(/\b(?:ORO|ARGENTO)\b|\b\d{1,2}\s*(?:kt|k)\b|\b\d{3}\s*‰/i);
    if (boundary >= 0) segment = segment.slice(0, boundary);
    const candidate = segment.match(/^[\s·:]*(?:€\s*)?([+\-−]?[0-9][0-9.,]*)/);
    if (candidate && /[1-9]/.test(candidate[1])) publishedKeys.add(definition.key);
    const match = segment.match(/^[\s·:]*([0-9]+(?:[,.][0-9]{1,2})?)\s*(?:€|EUR)\s*\/\s*(?:gr|g|grammo|grammi)\b/i);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = definition.key;
    if (quotes.has(key) && quotes.get(key).price_per_gram !== price) conflicts.add(key);
    quotes.set(key, oroDOroQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: label[0] + segment.slice(0, match.index + match[0].length),
      unit: "EUR/g"
    }, options));
  }
  return {
    quotes: [...quotes].filter(([key]) => !conflicts.has(key)).map(([, quote]) => quote),
    publishedKeys
  };
}

export function extractOroDOroQuotesFromText(text = "", options = {}) {
  return parseOroDOroQuotePage(text, options).quotes;
}

export async function fetchOroDOroPage(url = ORO_DORO_DEFAULT_URL, options = {}) {
  const canonicalUrl = new URL(url);
  if (canonicalUrl.hostname === "www.comproorodoro.it") canonicalUrl.hostname = "comproorodoro.it";
  const response = await safeExternalFetch(canonicalUrl, {
    allowedHosts: ORO_DORO_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || ORO_DORO_HTML_MAX_BYTES), ORO_DORO_HTML_MAX_BYTES),
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
    url: response.url || canonicalUrl.toString(),
    html,
    text: extractReadableTextFromHtml(html),
    method: "safe_external_fetch"
  };
}

function missingOroDOroDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.oro_doro_key).filter(Boolean));
  return ORO_DORO_DEFINITIONS.filter((definition) => !found.has(definition.key));
}

export function createOroDOroExtractor(options = {}) {
  const config = {
    url: options.url || ORO_DORO_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || ORO_DORO_HTML_MAX_BYTES), ORO_DORO_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000),
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractOroDOroQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchOroDOroPage(runtime.url, runtime);
      pages.push(homepage);
    } catch (error) {
      warnings.push(`Homepage Oro D'Oro non leggibile: ${error.message || "errore fetch"}`);
    }

    const parsedPages = pages.map((page) => parseOroDOroQuotePage(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    }));
    const quotes = parsedPages.flatMap((page) => page.quotes);
    const publishedKeys = new Set(parsedPages.flatMap((page) => [...page.publishedKeys]));
    const missing = missingOroDOroDefinitions(quotes);
    const excludedFields = missing.filter((definition) => (
      definition.purity_code === "20kt" && quotes.length > 0 && !publishedKeys.has(definition.key)
    )).map((definition) => ({
      field_key: definition.key,
      metal: definition.metal,
      purity_code: definition.purity_code,
      reason: "20 kt escluso finché non viene pubblicato un prezzo ufficiale verificabile. Storico conservato."
    }));
    const excludedKeys = new Set(excludedFields.map((field) => field.field_key));

    // AI fallback Oro D'Oro is deliberately excluded: only source-backed prices.
    const missingFields = missing.filter((definition) => !excludedKeys.has(definition.key)).map((definition) => ({
      field_key: definition.key,
      metal: definition.metal,
      purity_code: definition.purity_code,
      error: `${definition.label}: nessun prezzo verificabile in EUR/g nella pagina ufficiale Oro D'Oro. Nessuna stima utilizzata.`
    }));
    warnings.push(...missingFields.map((field) => field.error));

    const requiredCount = ORO_DORO_DEFINITIONS.length - excludedFields.length;
    const foundCount = quotes.length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "oro_doro",
      verified_only: true,
      missing_fields: missingFields,
      excluded_fields: excludedFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractOroDOroQuotes };
}

export async function extractOroDOroQuotes(options = {}) {
  return createOroDOroExtractor(options).extractOroDOroQuotes(options);
}
