import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const BORDIN_DEFAULT_URL = "https://oroemetallipreziosi.com";
const BORDIN_ALLOWED_HOSTS = new Set([
  "oroemetallipreziosi.com",
  "www.oroemetallipreziosi.com",
  "orometallipreziosi.com",
  "www.orometallipreziosi.com"
]);

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
    required: false,
    anchor: "Argento 999"
  },
  {
    key: "bordin_silver_925",
    label: "Argento 925",
    metal: "silver",
    purity_code: "925",
    purity_value: 0.925,
    fineness_per_mille: 925,
    required: false,
    anchor: "Argento 925"
  },
  {
    key: "bordin_silver_800",
    label: "Argento 800",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    fineness_per_mille: 800,
    required: false,
    anchor: "Argento 800"
  }
];

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function definitionByKey(key = "") {
  return BORDIN_DEFINITIONS.find((item) => item.key === key) || {};
}

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}`;
}

function priceUnitPattern() {
  return "(?:€\\s*)?([0-9][0-9.,]*)\\s*(?:€\\s*)?(?:/\\s*)?(g|gr|grammo|grammi)\\b";
}

function perMillePattern(definition = {}) {
  const value = String(definition.fineness_per_mille || "").replace(".", "[,.]?");
  return value ? `${value}\\s*(?:‰|per\\s*mille|\\/\\s*1000)` : "";
}

function regexesForDefinition(definition = {}) {
  const unitPattern = priceUnitPattern();
  const kt = String(definition.purity_code || "").replace(/kt/i, "");
  if (definition.metal === "gold") {
    const fineness = perMillePattern(definition);
    return [
      new RegExp(`\\bOro\\s*${kt}\\s*(?:kt|k)\\b[\\s\\S]{0,140}?${fineness}[\\s\\S]{0,140}?${unitPattern}`, "i"),
      new RegExp(`\\bOro\\s*${kt}\\s*(?:kt|k)\\b[\\s\\S]{0,220}?${unitPattern}`, "i"),
      new RegExp(`${fineness}[\\s\\S]{0,120}?\\bOro\\s*${kt}\\s*(?:kt|k)\\b[\\s\\S]{0,140}?${unitPattern}`, "i")
    ];
  }
  const title = String(definition.purity_code || "");
  return [
    new RegExp(`\\bArgento\\s*${title}\\b[\\s\\S]{0,160}?${unitPattern}`, "i"),
    new RegExp(`\\b${title}\\s*(?:‰|\\/\\s*1000)?[\\s\\S]{0,80}?Argento[\\s\\S]{0,160}?${unitPattern}`, "i")
  ];
}

function parseProviderTimestamp(text = "") {
  const match = String(text || "").match(/Quotazione\s+aggiornata\s+il\s+([0-9]{2})-([0-9]{2})-([0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/i);
  if (!match) return { providerTimestamp: null, providerTimestampText: "" };
  const [, day, month, year, time] = match;
  const date = new Date(`${year}-${month}-${day}T${time}`);
  return {
    providerTimestamp: Number.isNaN(date.getTime()) ? null : date.toISOString(),
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
  if (!startMatch || startMatch.index === undefined) return source;
  const start = startMatch.index;
  const rest = source.slice(start);
  if (!endPattern) return rest;
  const endMatch = rest.slice(Math.max(startMatch[0].length, 1)).match(endPattern);
  if (!endMatch || endMatch.index === undefined) return rest;
  return rest.slice(0, Math.max(startMatch[0].length, 1) + endMatch.index);
}

function sectionOptionsForDefinition(definition = {}, normalizedText = "", baseOptions = {}) {
  const section = definition.metal === "silver"
    ? textSection(normalizedText, /Quotazione\s+Argento/i)
    : textSection(normalizedText, /Quotazione\s+Oro/i, /Quotazione\s+Argento/i);
  const timestamp = parseProviderTimestamp(section);
  const condition = extractCondition(section);
  return {
    ...baseOptions,
    providerTimestamp: timestamp.providerTimestamp || baseOptions.providerTimestamp,
    providerTimestampText: timestamp.providerTimestampText || baseOptions.providerTimestampText,
    conditionText: condition.conditionText || baseOptions.conditionText,
    minQuantityGrams: condition.minQuantityGrams ?? baseOptions.minQuantityGrams
  };
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 240) {
  const source = String(text || "");
  const anchorRegex = new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i");
  const anchorMatch = source.match(anchorRegex);
  if (!anchorMatch || anchorMatch.index === undefined) return null;
  const snippet = source.slice(anchorMatch.index, anchorMatch.index + maxDistance);
  const priceMatch = snippet.match(new RegExp(priceUnitPattern(), "i"));
  const price = priceMatch ? parseItalianEuroPrice(priceMatch[1]) : 0;
  if (!price) return null;
  return {
    value: price,
    unit: unitFromText(priceMatch[2] || "EUR/g"),
    evidenceText: compactText(snippet.slice(0, priceMatch.index + priceMatch[0].length)).slice(0, 700)
  };
}

function bordinQuote(definition = {}, price = 0, sourceUrl = BORDIN_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const providerTimestamp = options.providerTimestamp || rawPayload.provider_timestamp || null;
  const quoteDate = options.quoteDate || providerTimestamp || new Date().toISOString();
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
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: "customer_buyback",
    evidence_text: rawPayload.matched_text
      ? compactText(rawPayload.matched_text).slice(0, 700)
      : `${definition.label}: ${formatEvidencePrice(price, unit)}`,
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      bordin_key: definition.key,
      bordin_mapping: definition.purity_code,
      fineness_per_mille: definition.fineness_per_mille,
      provider_timestamp: providerTimestamp,
      provider_timestamp_text: options.providerTimestampText || rawPayload.provider_timestamp_text || "",
      condition_text: options.conditionText || rawPayload.condition_text || "",
      min_quantity_grams: options.minQuantityGrams ?? rawPayload.min_quantity_grams ?? null
    }
  };
}

function addRegexQuote(quotes = [], text = "", definition = {}, sourceUrl = BORDIN_DEFAULT_URL, options = {}) {
  for (const regex of regexesForDefinition(definition)) {
    const match = text.match(regex);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!price) continue;
    const unit = unitFromText(match[2] || "EUR/g");
    quotes.push(bordinQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: match[0],
      unit
    }, { ...options, unit }));
    return true;
  }
  return false;
}

function addAnchorFallbackQuote(quotes = [], text = "", definition = {}, sourceUrl = BORDIN_DEFAULT_URL, options = {}) {
  if (quotes.some((quote) => quoteKey(quote) === `${definition.metal}:${definition.purity_code}`)) return false;
  const found = extractPriceNearAnchor(text, definition.anchor || definition.label, 260);
  if (!found?.value) return false;
  quotes.push(bordinQuote(definition, found.value, sourceUrl, {
    source_method: "anchor_near_price",
    matched_text: found.evidenceText,
    unit: found.unit
  }, { ...options, unit: found.unit }));
  return true;
}

export function extractBordinQuotesFromText(text = "", options = {}) {
  const sourceUrl = canonicalBordinUrl(options.sourceUrl || BORDIN_DEFAULT_URL);
  const normalized = compactText(decodeHtml(text));
  const timestamp = parseProviderTimestamp(normalized);
  const condition = extractCondition(normalized);
  const quoteOptions = {
    ...options,
    providerTimestamp: timestamp.providerTimestamp,
    providerTimestampText: timestamp.providerTimestampText,
    conditionText: condition.conditionText,
    minQuantityGrams: condition.minQuantityGrams
  };
  const quotes = [];
  for (const definition of BORDIN_DEFINITIONS) {
    const definitionOptions = sectionOptionsForDefinition(definition, normalized, quoteOptions);
    const found = addRegexQuote(quotes, normalized, definition, sourceUrl, definitionOptions);
    if (!found) addAnchorFallbackQuote(quotes, normalized, definition, sourceUrl, definitionOptions);
  }
  return dedupeBordinQuotes(quotes);
}

function dedupeBordinQuotes(quotes = []) {
  const map = new Map();
  for (const quote of quotes) {
    const existing = map.get(quoteKey(quote));
    if (!existing) {
      map.set(quoteKey(quote), quote);
      continue;
    }
    const preferNext = String(quote.raw_payload?.source_method || "").includes("playwright")
      && !String(existing.raw_payload?.source_method || "").includes("playwright");
    map.set(quoteKey(quote), preferNext ? quote : existing);
  }
  return [...map.values()];
}

export async function fetchBordinPage(url = BORDIN_DEFAULT_URL, options = {}) {
  const targetUrl = canonicalBordinUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
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
      text: extractReadableTextFromHtml(html),
      method: "fetch"
    };
  } finally {
    clearTimeout(timeout);
  }
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

async function renderBordinPageWithPlaywright(url = BORDIN_DEFAULT_URL, options = {}) {
  if (!options.usePlaywright) return { page: null, warning: "Playwright disattivato." };
  const targetUrl = canonicalBordinUrl(url);
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return { page: null, warning: "Playwright non disponibile, uso fetch HTML semplice." };
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: options.userAgent || "OroActiveBot/1.0" });
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: Number(options.timeoutMs || 15000) });
    const acceptButton = page.getByText(/accetto|accetta|ok/i);
    if (await acceptButton.count().catch(() => 0)) {
      await acceptButton.first().click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(1500);
    return {
      page: {
        url: canonicalBordinUrl(page.url() || targetUrl),
        html: "",
        text: await page.evaluate(() => document.body?.innerText || ""),
        method: "playwright"
      },
      warning: ""
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

function requiredMissingDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.bordin_key).filter(Boolean));
  return BORDIN_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}

async function extractBordinQuotesWithAi(pageTexts = [], options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback Bordin non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Bordin / Oro Metalli Preziosi. Devi estrarre solo le quotazioni chiaramente visibili nel riquadro QUOTAZIONE ORO IN TEMPO REALE: Oro 24kt - 999,9‰, Oro 18kt - 750‰, Oro 14kt - 585‰. Se trovi argento solo con titolo chiaro 999/925/800, puoi restituirlo. Non inventare dati. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Bordin. Estrai solo:
1. Oro 24kt - 999,9‰
2. Oro 18kt - 750‰
3. Oro 14kt - 585‰
Eventuali argenti solo se esplicitamente indicati come Argento 999, 925 o 800.
Restituisci provider_timestamp_text e condition_text se presenti.

TESTO:
${pageTexts.map((page) => `URL: ${page.url}\n${String(page.text || "").replace(/\s+/g, " ").trim()}`).join("\n\n---\n\n").slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "bordin_quote_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            found: { type: "boolean" },
            provider_timestamp_text: { type: "string" },
            condition_text: { type: "string" },
            quotes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  metal: { type: "string", enum: ["gold", "silver"] },
                  purity_code: { type: "string" },
                  purity_value: { type: "number" },
                  fineness_per_mille: { type: "number" },
                  price: { type: "number" },
                  unit: { type: "string" },
                  quote_type: { type: "string", enum: ["customer_buyback"] },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  page_url: { type: "string" }
                },
                required: ["metal", "purity_code", "purity_value", "fineness_per_mille", "price", "unit", "quote_type", "evidence_text", "confidence", "page_url"]
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            notes: { type: "string" }
          },
          required: ["found", "provider_timestamp_text", "condition_text", "quotes", "warnings", "notes"]
        }
      }
    }
  });
  const parsed = JSON.parse(response.output_text || "{}");
  const timestamp = parseProviderTimestamp(parsed.provider_timestamp_text ? `Quotazione aggiornata il ${parsed.provider_timestamp_text}` : "");
  const condition = extractCondition(parsed.condition_text || "");
  const quotes = (parsed.quotes || []).map((quote) => {
    const definition = BORDIN_DEFINITIONS.find((item) => (
      item.metal === quote.metal
      && item.purity_code === quote.purity_code
    ));
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || "EUR/g");
    return bordinQuote(definition, price, quote.page_url || options.sourceUrl || BORDIN_DEFAULT_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit
    }, {
      ...options,
      unit,
      providerTimestamp: timestamp.providerTimestamp,
      providerTimestampText: timestamp.providerTimestampText || parsed.provider_timestamp_text || "",
      conditionText: condition.conditionText || parsed.condition_text || "",
      minQuantityGrams: condition.minQuantityGrams,
      extractionMethod: "ai_bordin_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes: dedupeBordinQuotes(quotes), warnings: parsed.warnings || [] };
}

export function createBordinExtractor(options = {}) {
  const config = {
    url: canonicalBordinUrl(options.url || BORDIN_DEFAULT_URL),
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
  };

  async function extractBordinQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchBordinPage(runtime.url, runtime);
      pages.push(homepage);
      const quoteUrls = discoverBordinQuoteUrls(homepage.html, homepage.url || runtime.url);
      for (const quoteUrl of quoteUrls) {
        if (pages.some((page) => page.url === quoteUrl)) continue;
        const page = await fetchBordinPage(quoteUrl, runtime).catch((error) => {
          warnings.push(`Pagina Bordin non leggibile ${quoteUrl}: ${error.message || "errore fetch"}`);
          return null;
        });
        if (page) pages.push(page);
        if (pages.length >= 5) break;
      }
    } catch (error) {
      warnings.push(`Homepage Bordin non leggibile: ${error.message || "errore fetch"}`);
    }

    let quotes = dedupeBordinQuotes(pages.flatMap((page) => extractBordinQuotesFromText(`${page.text}\n${page.html || ""}`, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    })));

    if (requiredMissingDefinitions(quotes).length && runtime.usePlaywright) {
      const rendered = await renderBordinPageWithPlaywright(runtime.url, runtime).catch((error) => ({
        page: null,
        warning: error.message || "Rendering Playwright Bordin non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.page) {
        pages.push(rendered.page);
        quotes = dedupeBordinQuotes(quotes.concat(extractBordinQuotesFromText(rendered.page.text, {
          ...runtime,
          sourceUrl: rendered.page.url || runtime.url
        })));
      }
    }

    if (requiredMissingDefinitions(quotes).length && runtime.useAiFallback) {
      const ai = await extractBordinQuotesWithAi(pages, {
        ...runtime,
        sourceUrl: runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Bordin non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length) quotes = dedupeBordinQuotes(quotes.concat(ai.quotes));
    }

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Bordin non rilevato automaticamente.`);
    }

    const requiredCount = BORDIN_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "bordin",
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
