import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const GRUPPO_ORO_24K_DEFAULT_URL = "https://www.comprooromilano.org";
const GRUPPO_ORO_24K_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

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
  const date = new Date(`${year}-${month}-${day}T${time}+02:00`);
  return {
    providerTimestamp: Number.isNaN(date.getTime()) ? null : date.toISOString(),
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
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: definition.quote_type,
    evidence_text: evidence,
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      gruppo_oro_24k_key: definition.key,
      gruppo_oro_24k_mapping: definition.purity_code,
      gruppo_oro_24k_quote_type: definition.quote_type,
      fineness_per_mille: definition.fineness_per_mille
    }
  };
}

function regexesForDefinition(definition = {}) {
  const price = decimalGramPricePattern();
  const label = definition.label.replace(/\s+/g, "\\s*");
  const carati = definition.purity_code.replace("kt", "");
  if (definition.metal === "gold") {
    return [
      new RegExp(`${label}[\\s\\S]{0,140}?Compro\\s+Oro\\s+${carati}\\s+Carati[\\s\\S]{0,80}?${price}`, "i"),
      new RegExp(`Compro\\s+Oro\\s+${carati}\\s+Carati[\\s\\S]{0,80}?${price}`, "i")
    ];
  }
  return [
    new RegExp(`${label}[\\s\\S]{0,140}?Compro\\s+Argento\\s+${definition.purity_code}[\\s\\S]{0,80}?${price}`, "i"),
    new RegExp(`Compro\\s+Argento\\s+${definition.purity_code}[\\s\\S]{0,80}?${price}`, "i")
  ];
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 220) {
  const source = String(text || "");
  const anchorRegex = new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i");
  const anchorMatch = source.match(anchorRegex);
  if (!anchorMatch || anchorMatch.index === undefined) return null;
  const snippet = source.slice(anchorMatch.index, anchorMatch.index + maxDistance);
  const match = snippet.match(new RegExp(decimalGramPricePattern(), "i"));
  const price = match ? parseItalianEuroPrice(match[1]) : 0;
  if (!price) return null;
  return {
    value: price,
    unit: unitFromText(match[0] || "EUR/g"),
    evidenceText: compactText(snippet.slice(0, match.index + match[0].length)).slice(0, 700)
  };
}

function addRegexQuote(quotes = [], text = "", definition = {}, sourceUrl = GRUPPO_ORO_24K_DEFAULT_URL, options = {}) {
  for (const regex of regexesForDefinition(definition)) {
    const match = text.match(regex);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!price) continue;
    const unit = definition.defaultUnit || "EUR/g";
    quotes.push(gruppoOro24kQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: match[0],
      unit,
      provider_timestamp: options.providerTimestamp || null,
      provider_timestamp_text: options.providerTimestampText || ""
    }, { ...options, unit }));
    return true;
  }
  return false;
}

function addAnchorFallbackQuote(quotes = [], text = "", definition = {}, sourceUrl = GRUPPO_ORO_24K_DEFAULT_URL, options = {}) {
  if (quotes.some((quote) => quoteKey(quote) === `${definition.metal}:${definition.purity_code}:${definition.quote_type}`)) return false;
  for (const anchor of definition.anchors || [definition.label]) {
    const found = extractPriceNearAnchor(text, anchor, 260);
    if (!found?.value) continue;
    const unit = definition.defaultUnit || "EUR/g";
    quotes.push(gruppoOro24kQuote(definition, found.value, sourceUrl, {
      source_method: "anchor_near_price",
      matched_text: found.evidenceText,
      unit,
      provider_timestamp: options.providerTimestamp || null,
      provider_timestamp_text: options.providerTimestampText || ""
    }, { ...options, unit }));
    return true;
  }
  return false;
}

function dedupeGruppoOro24kQuotes(quotes = []) {
  const map = new Map();
  for (const quote of quotes) {
    const key = quoteKey(quote);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, quote);
      continue;
    }
    const preferNext = String(quote.raw_payload?.source_method || "").includes("playwright")
      && !String(existing.raw_payload?.source_method || "").includes("playwright");
    map.set(key, preferNext ? quote : existing);
  }
  return [...map.values()];
}

export function extractGruppoOro24kQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || GRUPPO_ORO_24K_DEFAULT_URL;
  const normalized = compactText(decodeHtml(text));
  const timestamp = parseProviderTimestamp(normalized);
  const quotes = [];
  for (const definition of GRUPPO_ORO_24K_DEFINITIONS) {
    const found = addRegexQuote(quotes, normalized, definition, sourceUrl, { ...options, ...timestamp });
    if (!found) addAnchorFallbackQuote(quotes, normalized, definition, sourceUrl, { ...options, ...timestamp });
  }
  return dedupeGruppoOro24kQuotes(quotes);
}

export async function fetchGruppoOro24kPage(url = GRUPPO_ORO_24K_DEFAULT_URL, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
  try {
    const headersFor = (userAgent) => ({
      Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
      "User-Agent": userAgent
    });
    let response = await fetch(url, {
      signal: controller.signal,
      headers: headersFor(options.userAgent || "OroActiveBot/1.0")
    });
    if (response.status === 403 && (options.userAgent || "OroActiveBot/1.0") !== GRUPPO_ORO_24K_BROWSER_USER_AGENT) {
      response = await fetch(url, {
        signal: controller.signal,
        headers: headersFor(GRUPPO_ORO_24K_BROWSER_USER_AGENT)
      });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return {
      url: response.url || url,
      html,
      text: extractReadableTextFromHtml(html),
      method: "fetch"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function renderGruppoOro24kPageWithPlaywright(url = GRUPPO_ORO_24K_DEFAULT_URL, options = {}) {
  if (!options.usePlaywright) return { page: null, warning: "Playwright disattivato." };
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return { page: null, warning: "Playwright non disponibile, uso fetch HTML semplice." };
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: options.userAgent || "OroActiveBot/1.0" });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: Number(options.timeoutMs || 15000) });
    await page.waitForTimeout(900);
    return {
      page: {
        url: page.url() || url,
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
  const found = new Set(quotes.map((quote) => quote.raw_payload?.gruppo_oro_24k_key).filter(Boolean));
  return GRUPPO_ORO_24K_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}

async function extractGruppoOro24kQuotesWithAi(pageTexts = [], options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback Gruppo Oro 24K non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per Gruppo Oro 24K. Devi estrarre SOLO le quattro quotazioni pubbliche di acquisto cliente dal riquadro 'Quotazioni in tempo reale': ORO 24 Carati, ORO 18 Carati, Argento 999, Argento 800. Non estrarre monete, sterline, krugerrand, prezzi vendita o valori di borsa. Non inventare dati. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Gruppo Oro 24K. Estrai solo:
1. ORO 24 Carati
2. ORO 18 Carati
3. Argento 999
4. Argento 800
Se un prezzo non e chiaramente presente, non inventarlo.

TESTO:
${pageTexts.map((page) => `URL: ${page.url}\n${String(page.text || "").replace(/\s+/g, " ").trim()}`).join("\n\n---\n\n").slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "gruppo_oro_24k_quote_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            found: { type: "boolean" },
            quotes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  metal: { type: "string", enum: ["gold", "silver"] },
                  purity_code: { type: "string", enum: ["24kt", "18kt", "999", "800"] },
                  price: { type: "number" },
                  unit: { type: "string" },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  page_url: { type: "string" }
                },
                required: ["metal", "purity_code", "price", "unit", "evidence_text", "confidence", "page_url"]
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            notes: { type: "string" }
          },
          required: ["found", "quotes", "warnings", "notes"]
        }
      }
    }
  });
  const parsed = JSON.parse(response.output_text || "{}");
  const quotes = (parsed.quotes || []).map((quote) => {
    const definition = GRUPPO_ORO_24K_DEFINITIONS.find((item) => item.metal === quote.metal && item.purity_code === quote.purity_code);
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
    return gruppoOro24kQuote(definition, price, quote.page_url || options.sourceUrl || GRUPPO_ORO_24K_DEFAULT_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit
    }, {
      ...options,
      unit,
      extractionMethod: "ai_gruppo_oro_24k_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes: dedupeGruppoOro24kQuotes(quotes), warnings: parsed.warnings || [] };
}

export function createGruppoOro24kExtractor(options = {}) {
  const config = {
    url: options.url || GRUPPO_ORO_24K_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
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

    let quotes = dedupeGruppoOro24kQuotes(pages.flatMap((page) => extractGruppoOro24kQuotesFromText(`${page.text}\n${page.html || ""}`, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    })));

    if (requiredMissingDefinitions(quotes).length && runtime.usePlaywright) {
      const rendered = await renderGruppoOro24kPageWithPlaywright(runtime.url, runtime).catch((error) => ({
        page: null,
        warning: error.message || "Rendering Playwright Gruppo Oro 24K non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.page) {
        pages.push(rendered.page);
        quotes = dedupeGruppoOro24kQuotes(quotes.concat(extractGruppoOro24kQuotesFromText(rendered.page.text, {
          ...runtime,
          sourceUrl: rendered.page.url || runtime.url
        })));
      }
    }

    if (requiredMissingDefinitions(quotes).length && runtime.useAiFallback) {
      const ai = await extractGruppoOro24kQuotesWithAi(pages, {
        ...runtime,
        sourceUrl: runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Gruppo Oro 24K non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length) quotes = dedupeGruppoOro24kQuotes(quotes.concat(ai.quotes));
    }

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Gruppo Oro 24K non rilevato automaticamente.`);
    }

    const requiredCount = GRUPPO_ORO_24K_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "gruppo_oro_24k",
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractGruppoOro24kQuotes };
}

export async function extractGruppoOro24kQuotes(options = {}) {
  return createGruppoOro24kExtractor(options).extractGruppoOro24kQuotes(options);
}
