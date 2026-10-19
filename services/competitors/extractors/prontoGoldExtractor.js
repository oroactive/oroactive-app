import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";
import { safeExternalFetch } from "../../security/safeExternalFetch.js";

const PRONTO_GOLD_DEFAULT_URL = "https://www.prontogold.com";
const PRONTO_GOLD_QUOTE_URL = "https://www.prontogold.com/quotazioni";
const PRONTO_GOLD_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PRONTO_GOLD_ALLOWED_HOSTS = ["prontogold.com"];
const PRONTO_GOLD_HTML_MAX_BYTES = 2 * 1024 * 1024;

const PRONTO_GOLD_DEFINITIONS = [
  {
    key: "pronto_gold_reference_gold",
    label: "Valore dell'ORO sulle Borse internazionali",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "reference_market_gold_price",
    price_kind: "reference_market",
    required: true,
    anchor: "Valore dell'ORO",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_gold_24kt_buy",
    label: "ORO PURO 24k Acquisto",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "customer_buyback",
    price_kind: "buy",
    required: true,
    anchor: "ORO PURO 24k",
    priceLabel: "Acquisto",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_gold_24kt_sell",
    label: "ORO PURO 24k Vendita",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "sell_price",
    price_kind: "sell",
    required: true,
    anchor: "ORO PURO 24k",
    priceLabel: "Vendita",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_gold_18kt_range",
    label: "Compro ORO usato 18k da/a",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    quote_type: "customer_buyback",
    price_kind: "range",
    required: true,
    anchor: "Compro ORO usato 18k",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_gold_14kt",
    label: "Compro ORO usato 14k",
    metal: "gold",
    purity_code: "14kt",
    purity_value: 14 / 24,
    quote_type: "customer_buyback",
    price_kind: "buy",
    required: true,
    anchor: "Compro ORO usato 14k",
    priceLabel: "Acquisto",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_gold_9kt",
    label: "Compro ORO usato 9k",
    metal: "gold",
    purity_code: "9kt",
    purity_value: 9 / 24,
    quote_type: "customer_buyback",
    price_kind: "buy",
    required: true,
    anchor: "Compro ORO usato 9k",
    priceLabel: "Acquisto",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_reference_silver",
    label: "Valore dell'ARGENTO sulle Borse internazionali",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    quote_type: "reference_market_silver_price",
    price_kind: "reference_market",
    required: true,
    anchor: "Valore dell'ARGENTO",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_silver_999_buy",
    label: "ARGENTO PURO Acquisto",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    quote_type: "customer_buyback",
    price_kind: "buy",
    required: true,
    anchor: "ARGENTO PURO",
    priceLabel: "Acquisto",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_silver_999_sell",
    label: "ARGENTO PURO Vendita",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    quote_type: "sell_price",
    price_kind: "sell",
    required: true,
    anchor: "ARGENTO PURO",
    priceLabel: "Vendita",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_silver_925",
    label: "Compro ARGENTO usato 925",
    metal: "silver",
    purity_code: "925",
    purity_value: 0.925,
    quote_type: "customer_buyback",
    price_kind: "buy",
    required: true,
    anchor: "Compro ARGENTO usato 925",
    priceLabel: "Acquisto",
    defaultUnit: "EUR/g"
  },
  {
    key: "pronto_gold_silver_800",
    label: "Compro ARGENTO usato 800",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    quote_type: "customer_buyback",
    price_kind: "buy",
    required: true,
    anchor: "Compro ARGENTO usato 800",
    priceLabel: "Acquisto",
    defaultUnit: "EUR/g"
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
    .replace(/&#x20AC;|&#8364;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&#038;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "’")
    .replace(/&quot;/gi, "\"");
}

function escapeRegex(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+").replace(/'/g, "[’']");
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
  const dotParts = compact.split(".");
  if (dotParts.length > 2) return Number(compact.replace(/\./g, ""));
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
    maximumFractionDigits: 3
  }).format(Number(value || 0));
  return `${formatted} ${unitFromText(unit) === "EUR/kg" ? "€/kg" : "€/Grammo"}`;
}

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}:${quote.quote_type}:${quote.raw_payload?.pronto_gold_key || ""}`;
}

export function parseProntoGoldProviderTimestamp(text = "") {
  const normalized = officialText(text);
  const match = normalized.match(/Aggiornamento:\s*([a-zàèéìòù]+)?\s*(\d{2})-(\d{2})-(\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})/i);
  if (!match) return { text: "", iso: null };
  const [, day = "", dd, mm, yy, hh, min, ss] = match;
  return {
    text: compactText(`${day} ${dd}-${mm}-${yy} ${hh}:${min}:${ss}`),
    iso: null
  };
}

const PRONTO_GOLD_PRICE = "([0-9][0-9.,]*)\\s*(?:Euro|EUR|€)\\s*\\/\\s*(?:Grammo|grammi|gr|g)\\b";

function publishedPricesForDefinition(segment = "", definition = {}) {
  const prices = [];
  if (definition.price_kind === "range") {
    const match = segment.match(new RegExp(`^\\s*da\\s*${PRONTO_GOLD_PRICE}\\s+a\\s*${PRONTO_GOLD_PRICE}`, "i"));
    const min = match ? parseItalianEuroPrice(match[1]) : 0;
    const max = match ? parseItalianEuroPrice(match[2]) : 0;
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) prices.push({ value: max, min, max, evidenceText: match[0] });
  } else if (definition.priceLabel) {
    const labels = [...segment.matchAll(/\b(?:Acquisto|Vendita)\b/gi)];
    for (let index = 0; index < labels.length; index += 1) {
      const label = labels[index];
      if (label[0].toLowerCase() !== definition.priceLabel.toLowerCase()) continue;
      const field = segment.slice(label.index + label[0].length, labels[index + 1]?.index ?? segment.length);
      const match = field.match(new RegExp(`^\\s*${PRONTO_GOLD_PRICE}`, "i"));
      const value = match ? parseItalianEuroPrice(match[1]) : 0;
      if (Number.isFinite(value) && value > 0) prices.push({ value, evidenceText: `${label[0]}${match[0]}` });
    }
  } else {
    const match = segment.match(new RegExp(`^\\s*sulle\\s+Borse\\s+internazionali\\s*${PRONTO_GOLD_PRICE}`, "i"));
    const value = match ? parseItalianEuroPrice(match[1]) : 0;
    if (Number.isFinite(value) && value > 0) prices.push({ value, evidenceText: match[0] });
  }
  return prices;
}

function prontoGoldEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  return `${definition.label}: ${formatEvidencePrice(price, unit)}`;
}

function prontoGoldQuote(definition = {}, price = 0, sourceUrl = PRONTO_GOLD_QUOTE_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Pronto Gold",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_pronto_gold_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: false,
    quote_type: definition.quote_type,
    evidence_text: prontoGoldEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      verified_official: true,
      pronto_gold_key: definition.key,
      pronto_gold_mapping: definition.purity_code,
      pronto_gold_quote_type: definition.quote_type,
      price_kind: definition.price_kind || rawPayload.price_kind || null,
      source_note: definition.quote_type === "customer_buyback"
        ? "Prezzo di acquisto/ritiro cliente"
        : definition.quote_type === "sell_price"
          ? "Prezzo di vendita pubblicato, non usato nel confronto buyback"
          : "Prezzo reference borsa, non usato nel confronto buyback"
    }
  };
}

export function extractProntoGoldQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || PRONTO_GOLD_QUOTE_URL;
  const normalized = officialText(text);
  const providerTimestamp = parseProntoGoldProviderTimestamp(normalized);
  const labels = [...normalized.matchAll(/\b(?:Valore\s+dell[’'](?:ORO|ARGENTO)\b|ORO\s+PURO\s*\d+\s*(?:kt|k)\b|Compro\s+ORO\s+usato\s*\d+\s*(?:kt|k)\b|ARGENTO\s+PURO\b|Compro\s+ARGENTO\s+usato\s*\d+\b)/gi)];
  const quotes = [];
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const segment = normalized.slice(label.index + label[0].length, labels[index + 1]?.index ?? normalized.length);
    const definitions = PRONTO_GOLD_DEFINITIONS.filter((definition) => new RegExp(`^${escapeRegex(definition.anchor)}$`, "i").test(label[0]));
    for (const definition of definitions) {
      for (const parsed of publishedPricesForDefinition(segment, definition)) {
        quotes.push(prontoGoldQuote(definition, parsed.value, sourceUrl, {
          source_method: "text_regex",
          matched_text: `${label[0]} ${parsed.evidenceText}`,
          unit: "EUR/g",
          provider_timestamp_text: providerTimestamp.text,
          provider_timestamp: providerTimestamp.iso,
          range_min_per_gram: parsed.min ?? null,
          range_max_per_gram: parsed.max ?? null,
          price_kind: definition.price_kind
        }, { ...options, unit: "EUR/g" }));
      }
    }
  }
  return dedupeProntoGoldQuotes(quotes);
}

function dedupeProntoGoldQuotes(quotes = []) {
  const map = new Map();
  const conflicts = new Set();
  for (const quote of quotes) {
    const key = quoteKey(quote);
    const previous = map.get(key);
    if (previous && (previous.price_per_gram !== quote.price_per_gram
      || previous.raw_payload.range_min_per_gram !== quote.raw_payload.range_min_per_gram
      || previous.raw_payload.range_max_per_gram !== quote.raw_payload.range_max_per_gram)) conflicts.add(key);
    else map.set(key, quote);
  }
  return [...map.entries()].filter(([key]) => !conflicts.has(key)).map(([, quote]) => quote);
}

export async function fetchProntoGoldPage(url = PRONTO_GOLD_DEFAULT_URL, options = {}) {
  const requestHeaders = (userAgent) => ({
    Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
    "User-Agent": userAgent
  });
  const request = (userAgent) => safeExternalFetch(url, {
    allowedHosts: PRONTO_GOLD_ALLOWED_HOSTS,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || PRONTO_GOLD_HTML_MAX_BYTES), PRONTO_GOLD_HTML_MAX_BYTES),
    maxRedirects: 3,
    allowedContentTypes: ["text/html", "application/xhtml+xml", "application/json", "text/plain"],
    signal: options.signal,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    headers: requestHeaders(userAgent)
  });
  const configuredUserAgent = options.userAgent || "OroActiveBot/1.0";
  let response = await request(configuredUserAgent);
  if ([403, 406, 429].includes(response.status) && configuredUserAgent !== PRONTO_GOLD_BROWSER_USER_AGENT) {
    response = await request(PRONTO_GOLD_BROWSER_USER_AGENT);
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

function resolveProntoGoldUrl(href = "", baseUrl = PRONTO_GOLD_DEFAULT_URL) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    if (!/(\.|^)prontogold\.com$/i.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function discoverProntoGoldQuoteUrls(html = "", baseUrl = PRONTO_GOLD_DEFAULT_URL, quoteUrl = PRONTO_GOLD_QUOTE_URL) {
  const urls = [baseUrl, quoteUrl, `${baseUrl.replace(/\/$/, "")}/quotazioni/`];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = linkRegex.exec(String(html || "")))) {
    const href = match[1] || "";
    const label = extractReadableTextFromHtml(match[2] || "");
    if (!/(quotazion|compro\s*oro|compro\s*argento|oro\s*usato|argento\s*usato|prezzo\s*oro|prezzo\s*argento)/i.test(`${href} ${label}`)) continue;
    const resolved = resolveProntoGoldUrl(href, baseUrl);
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls.map((url) => resolveProntoGoldUrl(url, baseUrl)).filter(Boolean))].slice(0, 8);
}

function requiredMissingDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.pronto_gold_key).filter(Boolean));
  return PRONTO_GOLD_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}

export function createProntoGoldExtractor(options = {}) {
  const config = {
    url: options.url || PRONTO_GOLD_DEFAULT_URL,
    quoteUrl: options.quoteUrl || PRONTO_GOLD_QUOTE_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    maxBytes: Math.min(Number(options.maxBytes || PRONTO_GOLD_HTML_MAX_BYTES), PRONTO_GOLD_HTML_MAX_BYTES),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function extractProntoGoldQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const page = await fetchProntoGoldPage(runtime.quoteUrl || runtime.url, runtime);
      pages.push(page);
    } catch (error) {
      warnings.push(`Pagina quotazioni Pronto Gold non leggibile: ${error.message || "errore fetch"}`);
    }
    const quotes = dedupeProntoGoldQuotes(pages.flatMap((page) => extractProntoGoldQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.quoteUrl
    })));
    const missingFields = requiredMissingDefinitions(quotes).map((definition) => ({
      field_key: definition.key,
      metal: definition.metal,
      purity_code: definition.purity_code,
      quote_type: definition.quote_type,
      error: `${definition.label}: nessun prezzo verificabile nella fonte ufficiale. Nessuna stima utilizzata.`
    }));
    warnings.push(...missingFields.map((field) => field.error));
    const status = missingFields.length === 0 ? "success" : quotes.length ? "partial" : "failed";
    return {
      source: "pronto_gold",
      verified_only: true,
      missing_fields: missingFields,
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractProntoGoldQuotes };
}

export async function extractProntoGoldQuotes(options = {}) {
  return createProntoGoldExtractor(options).extractProntoGoldQuotes(options);
}
