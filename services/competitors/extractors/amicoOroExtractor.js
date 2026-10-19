import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const AMICO_ORO_DEFAULT_URL = "https://www.amico-oro.it";
const AMICO_ORO_ALLOWED_HOSTS = ["amico-oro.it"];
const AMICO_ORO_HTML_MAX_BYTES = 2 * 1024 * 1024;

const AMICO_ORO_GOLD_DEFINITIONS = [
  { key: "gold_24kt", label: "24K al gr", karat: "24", metal: "gold", purity_code: "24kt", purity_value: 1 },
  { key: "gold_18kt", label: "18K al gr", karat: "18", metal: "gold", purity_code: "18kt", purity_value: 0.75 },
  { key: "gold_14kt", label: "14K al gr", karat: "14", metal: "gold", purity_code: "14kt", purity_value: 14 / 24 }
];

const AMICO_ORO_SILVER_DEFINITIONS = [
  { key: "silver_999", label: "Argento 999", title: "999", metal: "silver", purity_code: "999", purity_value: 0.999 },
  { key: "silver_925", label: "Argento 925", title: "925", metal: "silver", purity_code: "925", purity_value: 0.925 },
  { key: "silver_800", label: "Argento 800", title: "800", metal: "silver", purity_code: "800", purity_value: 0.8 }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function officialText(value = "") {
  return compactText(extractReadableTextFromHtml(String(value || "").replace(/<!--[\s\S]*?-->/g, " ")));
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

function formatEvidencePrice(value = 0, unit = "EUR/g") {
  const price = Number(value || 0);
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
  return `${formatted} ${unit === "EUR/kg" ? "€/kg" : "€/g"}`;
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

function amicoOroEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  if (definition.metal === "silver") return `${definition.title} al ${unit === "EUR/kg" ? "Kg" : "gr"} = ${formatEvidencePrice(price, unit)}`;
  return `${definition.karat}K al gr = ${formatEvidencePrice(price, "EUR/g").replace("€/g", "€")}`;
}

function amicoOroQuote(definition = {}, price = 0, sourceUrl = AMICO_ORO_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Amico Oro",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_amico_oro_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: false,
    quote_type: "customer_buyback",
    evidence_text: amicoOroEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      verified_official: true,
      amico_oro_key: definition.key,
      amico_oro_mapping: definition.purity_code
    }
  };
}

export async function fetchAmicoOroPage(url = AMICO_ORO_DEFAULT_URL, options = {}) {
  const response = await safeExternalFetch(url, {
    allowedHosts: AMICO_ORO_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || AMICO_ORO_HTML_MAX_BYTES), AMICO_ORO_HTML_MAX_BYTES),
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
    url: response.url || url,
    html,
    text: officialText(html),
    method: "safe_external_fetch"
  };
}

export function extractAmicoOroQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || AMICO_ORO_DEFAULT_URL;
  const normalized = officialText(text);
  const definitions = [...AMICO_ORO_GOLD_DEFINITIONS, ...AMICO_ORO_SILVER_DEFINITIONS];
  const labels = [...normalized.matchAll(/\b(?:(\d{1,2})\s*(?:kt|k|carati|carato)\s+al\s+(chilogrammo|grammi|grammo|chilo|kilo|kg|gr|g)|(\d{3})\s+al\s+(chilogrammo|grammi|grammo|chilo|kilo|kg|gr|g))\b/gi)];
  const minimum = normalized.match(/minimo\s+(\d+)\s*grammi?\s+di\s+oro\s+e\s+(\d+(?:[.,]\d+)?)\s*kg\s+di\s+argento/i);
  const conditionText = normalized.match(/Data\s+l['’]alta\s+volatilit[àa][\s\S]*?minimo\s+\d+\s*grammi?\s+di\s+oro\s+e\s+\d+(?:[.,]\d+)?\s*kg\s+di\s+argento/i)?.[0] || minimum?.[0] || "";
  const quotes = new Map();
  const conflicts = new Set();
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const metal = label[1] ? "gold" : "silver";
    const code = label[1] ? `${label[1]}kt` : label[3];
    const definition = definitions.find((item) => item.metal === metal && item.purity_code === code);
    if (!definition || (metal === "silver" && !/\bargento\b/i.test(normalized.slice(0, label.index)))) continue;
    const unit = unitFromText(label[2] || label[4]);
    if ((metal === "gold" && unit !== "EUR/g") || (metal === "silver" && unit !== "EUR/kg")) continue;
    const segment = normalized.slice(label.index + label[0].length, labels[index + 1]?.index ?? normalized.length);
    const match = segment.match(/^\s*[=:]?\s*([0-9][0-9.,]*)\s*(?:€|EUR|euro)(?=\s|$)/i);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!Number.isFinite(price) || price <= 0) continue;
    const quote = amicoOroQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: `${label[0]}${match[0]}`,
      unit,
      condition: conditionText,
      condition_text: conditionText,
      min_quantity_grams: minimum ? (metal === "gold" ? Number(minimum[1]) : Number(minimum[2].replace(",", ".")) * 1000) : null
    }, { ...options, unit });
    if (quotes.has(definition.key) && quotes.get(definition.key).price_per_gram !== quote.price_per_gram) conflicts.add(definition.key);
    else quotes.set(definition.key, quote);
  }
  return [...quotes.entries()].filter(([key]) => !conflicts.has(key)).map(([, quote]) => quote);
}

export function createAmicoOroExtractor(options = {}) {
  const config = {
    url: options.url || AMICO_ORO_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || AMICO_ORO_HTML_MAX_BYTES), AMICO_ORO_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractAmicoOroQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    let page = null;
    try {
      page = await fetchAmicoOroPage(runtime.url, runtime);
    } catch (error) {
      warnings.push(`Homepage Amico Oro non leggibile: ${error.message || "errore fetch"}`);
    }

    const quotes = page?.text ? extractAmicoOroQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    }) : [];

    const definitions = [...AMICO_ORO_GOLD_DEFINITIONS, ...AMICO_ORO_SILVER_DEFINITIONS];
    const foundKeys = new Set(quotes.map((quote) => quote.raw_payload?.amico_oro_key));
    const missingFields = definitions.filter((definition) => !foundKeys.has(definition.key)).map((definition) => ({
      field_key: definition.key,
      metal: definition.metal,
      purity_code: definition.purity_code,
      quote_type: "customer_buyback",
      error: `${definition.label}: nessun prezzo verificabile nella fonte ufficiale. Nessuna stima utilizzata.`
    }));
    warnings.push(...missingFields.map((field) => field.error));
    const status = missingFields.length === 0 ? "success" : quotes.length ? "partial" : "failed";
    return {
      source: "amico_oro",
      verified_only: true,
      missing_fields: missingFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings
    };
  }

  return { extractAmicoOroQuotes };
}

export async function extractAmicoOroQuotes(options = {}) {
  return createAmicoOroExtractor(options).extractAmicoOroQuotes(options);
}
