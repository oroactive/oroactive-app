import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const ORO_EXPRESS_DEFAULT_URL = "https://www.oro-express.it";
const ORO_EXPRESS_ALLOWED_HOSTS = ["oro-express.it"];
const ORO_EXPRESS_HTML_MAX_BYTES = 2 * 1024 * 1024;
const ORO_EXPRESS_JSON_MAX_BYTES = 256 * 1024;
const ORO_EXPRESS_QUOTE_DEFINITIONS = [
  {
    key: "gold_pure",
    tipo: "orop",
    task: "getValoreOroWp",
    label: "oro puro",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    coefficient: 0.999,
    valueField: "valore_oro"
  },
  {
    key: "gold_used",
    tipo: "orou",
    task: "getValoreOroWp",
    label: "oro usato",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    coefficient: 0.75,
    valueField: "valore_oro"
  },
  {
    key: "silver_pure",
    tipo: "argentop",
    task: "getValoreArgentoWp",
    label: "argento puro",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    coefficient: 0.999,
    valueField: "valore_argento"
  },
  {
    key: "silver_used",
    tipo: "argentou",
    task: "getValoreArgentoWp",
    label: "argento usato",
    metal: "silver",
    purity_code: "used_generic",
    purity_value: 0,
    coefficient: 0.8,
    valueField: "valore_argento"
  }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function parseItalianEuroPrice(value = "") {
  const raw = String(value || "").replace(/\u00a0/g, " ").replace(/[^\d,.\s]/g, "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/\s+/g, "");
  if (compact.includes(",")) return Number(compact.replace(/\./g, "").replace(",", "."));
  const parts = compact.split(".");
  if (parts.length > 2) return Number(compact.replace(/\./g, ""));
  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) return Number(compact.replace(/\./g, ""));
  return Number(compact);
}

function formatItalianPrice(value = 0) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function normalizeOroExpressSilverUsed(definition, mapping = "generic") {
  if (definition.key !== "silver_used") return definition;
  if (mapping === "925") return { ...definition, purity_code: "925", purity_value: 0.925 };
  if (mapping === "800") return { ...definition, purity_code: "800", purity_value: 0.8 };
  return { ...definition, purity_code: "used_generic", purity_value: 0 };
}

function oroExpressEvidence(definition, pricePerGram) {
  return `Acquistiamo il tuo ${definition.label} a partire da ${formatItalianPrice(pricePerGram)} €/gr.`;
}

function oroExpressQuote(definition, pricePerGram, sourceUrl, rawPayload = {}, options = {}) {
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Oro Express",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: pricePerGram,
    price_per_kg: pricePerGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_oro_express_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: "customer_buyback",
    evidence_text: oroExpressEvidence(definition, pricePerGram),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      oro_express_key: definition.key,
      oro_express_tipo: definition.tipo,
      oro_express_mapping: definition.purity_code
    }
  };
}

export async function fetchOroExpressPage(url = ORO_EXPRESS_DEFAULT_URL, options = {}) {
  const response = await safeExternalFetch(url, {
    allowedHosts: ORO_EXPRESS_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || ORO_EXPRESS_HTML_MAX_BYTES), ORO_EXPRESS_HTML_MAX_BYTES),
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
    text: extractReadableTextFromHtml(html),
    method: "safe_external_fetch"
  };
}

async function fetchOroExpressJson(url = ORO_EXPRESS_DEFAULT_URL, definition = {}, options = {}) {
  const endpoint = new URL("/index.php", url);
  endpoint.searchParams.set("option", "com_oroexpress");
  endpoint.searchParams.set("controller", "controller");
  endpoint.searchParams.set("task", definition.task);
  endpoint.searchParams.set("format", "raw");
  endpoint.searchParams.set("tipo", definition.tipo);
  endpoint.searchParams.set("id_negozio", "null");
  const response = await safeExternalFetch(endpoint.toString(), {
    allowedHosts: ORO_EXPRESS_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.jsonMaxBytes || ORO_EXPRESS_JSON_MAX_BYTES), ORO_EXPRESS_JSON_MAX_BYTES),
    maxRedirects: 2,
    // Joomla's raw JSON endpoint is served with a text/html content type.
    // JSON.parse below still rejects an HTML error or challenge page.
    allowedContentTypes: ["application/json", "text/plain", "text/html"],
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.5",
      "X-Requested-With": "XMLHttpRequest",
      Referer: new URL("/", url).toString(),
      "User-Agent": options.userAgent || "OroActiveBot/1.0"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = await response.text();
  return { endpoint: endpoint.toString(), raw, json: JSON.parse(raw) };
}

function priceFromOroExpressWidgetJson(definition = {}, json = {}) {
  const number = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    return typeof value === "string" && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  };
  const rawValue = number(json?.[definition.valueField]);
  const variation = number(Array.isArray(json?.variazione) && json.variazione.length === 1 ? json.variazione[0] : json?.variazione);
  if (!(rawValue > 0) || !Number.isFinite(variation)) return 0;
  const price = Number(((rawValue * definition.coefficient) - variation).toFixed(2));
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function extractOroExpressQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || ORO_EXPRESS_DEFAULT_URL;
  const normalized = compactText(text);
  const silverUsedMapping = String(options.silverUsedMapping || "generic").toLowerCase();
  const patterns = {
    gold_pure: /Acquistiamo\s+il\s+tuo\s+oro\s+puro\s+a\s+partire\s+da\s+([0-9][0-9.,]*)\s*(?:€|EUR)\s*\/\s*(?:gr|g)\b/i,
    gold_used: /Acquistiamo\s+il\s+tuo\s+oro\s+usato\s+a\s+partire\s+da\s+([0-9][0-9.,]*)\s*(?:€|EUR)\s*\/\s*(?:gr|g)\b/i,
    silver_pure: /Acquistiamo\s+il\s+tuo\s+argento\s+puro\s+a\s+partire\s+da\s+([0-9][0-9.,]*)\s*(?:€|EUR)\s*\/\s*(?:gr|g)\b/i,
    silver_used: /Acquistiamo\s+il\s+tuo\s+argento\s+usato\s+a\s+partire\s+da\s+([0-9][0-9.,]*)\s*(?:€|EUR)\s*\/\s*(?:gr|g)\b/i
  };
  return ORO_EXPRESS_QUOTE_DEFINITIONS
    .map((baseDefinition) => {
      const definition = normalizeOroExpressSilverUsed(baseDefinition, silverUsedMapping);
      const match = normalized.match(patterns[baseDefinition.key]);
      const price = match ? parseItalianEuroPrice(match[1]) : 0;
      if (!price) return null;
      return oroExpressQuote(definition, price, sourceUrl, { source_method: "text_regex", matched_text: match[0] }, options);
    })
    .filter(Boolean);
}

async function extractOroExpressQuotesFromWidgetApi(url = ORO_EXPRESS_DEFAULT_URL, options = {}) {
  const silverUsedMapping = String(options.silverUsedMapping || "generic").toLowerCase();
  const quotes = [];
  const errors = [];
  for (const baseDefinition of ORO_EXPRESS_QUOTE_DEFINITIONS) {
    const definition = normalizeOroExpressSilverUsed(baseDefinition, silverUsedMapping);
    try {
      const result = await fetchOroExpressJson(url, baseDefinition, options);
      const price = priceFromOroExpressWidgetJson(baseDefinition, result.json);
      if (!price) {
        errors.push(`Prezzo ${baseDefinition.label} Oro Express non rilevato automaticamente.`);
        continue;
      }
      quotes.push(oroExpressQuote(definition, price, url, {
        source_method: "public_widget_json",
        endpoint: result.endpoint,
        widget_script_url: new URL("/modules/mod_quotazioni/js/script.js", url).toString(),
        coefficient: baseDefinition.coefficient,
        unit: "EUR/g",
        response: result.json
      }, options));
    } catch (error) {
      errors.push(`${baseDefinition.label}: ${error.message || "endpoint non leggibile"}`);
    }
  }
  return { quotes, errors };
}

export function createOroExpressExtractor(options = {}) {
  const config = {
    url: options.url || ORO_EXPRESS_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || ORO_EXPRESS_HTML_MAX_BYTES), ORO_EXPRESS_HTML_MAX_BYTES),
    jsonMaxBytes: Math.min(Number(options.jsonMaxBytes || ORO_EXPRESS_JSON_MAX_BYTES), ORO_EXPRESS_JSON_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    silverUsedMapping: options.silverUsedMapping || "generic",
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000),
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractOroExpressQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    let page = null;
    try {
      page = await fetchOroExpressPage(runtime.url, runtime);
    } catch (error) {
      warnings.push(`Homepage Oro Express non leggibile: ${error.message || "errore fetch"}`);
    }

    const textQuotes = page?.text ? extractOroExpressQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    }) : [];

    const widget = await extractOroExpressQuotesFromWidgetApi(runtime.url, runtime);
    warnings.push(...widget.errors);
    const quotes = ORO_EXPRESS_QUOTE_DEFINITIONS.map((definition) => (
      widget.quotes.find((quote) => quote.raw_payload?.oro_express_key === definition.key)
      || textQuotes.find((quote) => quote.raw_payload?.oro_express_key === definition.key)
    )).filter(Boolean);

    const foundKeys = new Set(quotes.map((quote) => quote.raw_payload?.oro_express_key));
    for (const definition of ORO_EXPRESS_QUOTE_DEFINITIONS) {
      if (!foundKeys.has(definition.key)) warnings.push(`Prezzo ${definition.label} Oro Express non rilevato automaticamente.`);
    }

    const status = quotes.length === ORO_EXPRESS_QUOTE_DEFINITIONS.length
      ? "success"
      : quotes.length
        ? "partial"
        : "failed";
    return {
      source: "oro_express",
      verified_only: true,
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings
    };
  }

  return { extractOroExpressQuotes };
}

export async function extractOroExpressQuotes(options = {}) {
  return createOroExpressExtractor(options).extractOroExpressQuotes(options);
}
