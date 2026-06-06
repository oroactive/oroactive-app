import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const ORO_DORO_DEFAULT_URL = "https://www.comproorodoro.it";

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

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}`;
}

function priceUnitPattern() {
  return "(?:€\\s*)?([0-9][0-9.,]*)\\s*(?:€\\s*)?(?:/\\s*)?(g|gr|grammo|grammi)\\b";
}

function regexesForDefinition(definition = {}) {
  const unitPattern = priceUnitPattern();
  if (definition.metal === "gold" && definition.purity_code === "24kt") {
    return [
      new RegExp(`\\bORO\\b\\s*${unitPattern}[\\s\\S]{0,40}?\\b24\\s*(?:kt|k)\\b`, "i"),
      new RegExp(`\\bORO\\s*24\\s*(?:kt|k)\\b[\\s\\S]{0,110}?${unitPattern}`, "i")
    ];
  }
  if (definition.metal === "gold") {
    return [
      new RegExp(`\\bORO\\s*${definition.token}\\s*(?:kt|k)\\b[\\s\\S]{0,110}?${unitPattern}`, "i"),
      new RegExp(`\\bORO\\b[\\s\\S]{0,80}?${unitPattern}[\\s\\S]{0,45}?\\b${definition.token}\\s*(?:kt|k)\\b`, "i")
    ];
  }
  if (definition.metal === "silver" && definition.purity_code === "999") {
    return [
      new RegExp(`\\bARGENTO\\b\\s*${unitPattern}[\\s\\S]{0,40}?\\b999\\b`, "i"),
      new RegExp(`\\bARGENTO\\s*999\\b[\\s\\S]{0,110}?${unitPattern}`, "i")
    ];
  }
  return [
    new RegExp(`\\bARGENTO\\s*${definition.token}\\b[\\s\\S]{0,110}?${unitPattern}`, "i"),
    new RegExp(`\\b${definition.token}\\s*ARGENTO\\b[\\s\\S]{0,110}?${unitPattern}`, "i")
  ];
}

function addRegexQuote(quotes = [], text = "", definitionKey = "", sourceUrl = ORO_DORO_DEFAULT_URL, options = {}) {
  const definition = oroDOroDefinition(definitionKey);
  for (const regex of regexesForDefinition(definition)) {
    const match = text.match(regex);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!price) continue;
    const unit = unitFromText(match[2] || "EUR/g");
    quotes.push(oroDOroQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: match[0],
      unit
    }, { ...options, unit }));
    return true;
  }
  return false;
}

export function extractOroDOroQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || ORO_DORO_DEFAULT_URL;
  const normalized = compactText(decodeHtml(text));
  const quotes = [];
  for (const definition of ORO_DORO_DEFINITIONS) {
    addRegexQuote(quotes, normalized, definition.key, sourceUrl, options);
  }
  return dedupeOroDOroQuotes(quotes);
}

function dedupeOroDOroQuotes(quotes = []) {
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

export async function fetchOroDOroPage(url = ORO_DORO_DEFAULT_URL, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
  try {
    const response = await fetch(url, {
      signal: controller.signal,
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
      method: "fetch"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function renderOroDOroPageWithPlaywright(url = ORO_DORO_DEFAULT_URL, options = {}) {
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
    const acceptButton = page.getByText(/accetto|accetta|ok/i);
    if (await acceptButton.count().catch(() => 0)) {
      await acceptButton.first().click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(1500);
    const texts = [];
    texts.push(await page.evaluate(() => document.body?.innerText || ""));
    for (const label of ["ORO", "ARGENTO"]) {
      const locator = page.getByText(label, { exact: true });
      if (await locator.count().catch(() => 0)) {
        await locator.first().click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(700);
        texts.push(await page.evaluate(() => document.body?.innerText || ""));
      }
    }
    return {
      page: {
        url: page.url() || url,
        html: "",
        text: texts.join("\n\n---\n\n"),
        method: "playwright"
      },
      warning: ""
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

function missingOroDOroDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.oro_doro_key).filter(Boolean));
  return ORO_DORO_DEFINITIONS.filter((definition) => !found.has(definition.key));
}

async function extractOroDOroQuotesWithAi(pageTexts = [], options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback Oro D'Oro non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Oro D'Oro. Devi estrarre solo le quotazioni cliente oro/argento pubbliche per ORO 24kt, 22kt, 21kt, 20kt, 18kt, 14kt, 9kt e ARGENTO 999, 925, 800. Non inventare dati. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Oro D'Oro. Estrai solo questi campi se chiaramente presenti:
- oro_doro_gold_24kt
- oro_doro_gold_22kt
- oro_doro_gold_21kt
- oro_doro_gold_20kt
- oro_doro_gold_18kt
- oro_doro_gold_14kt
- oro_doro_gold_9kt
- oro_doro_silver_999
- oro_doro_silver_925
- oro_doro_silver_800

I prezzi sono quotazioni di acquisto al cliente in EUR/g. Non inventare dati mancanti.

TESTO:
${pageTexts.map((page) => `URL: ${page.url}\n${compactText(page.text)}`).join("\n\n---\n\n").slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "oro_doro_quote_extraction",
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
                  field_key: { type: "string" },
                  metal: { type: "string", enum: ["gold", "silver"] },
                  purity_code: { type: "string" },
                  purity_value: { type: "number" },
                  price: { type: "number" },
                  unit: { type: "string" },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  page_url: { type: "string" }
                },
                required: ["field_key", "metal", "purity_code", "purity_value", "price", "unit", "evidence_text", "confidence", "page_url"]
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
    const definition = ORO_DORO_DEFINITIONS.find((item) => (
      item.key === quote.field_key
      || (item.metal === quote.metal && item.purity_code === quote.purity_code)
    ));
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || "EUR/g");
    return oroDOroQuote(definition, price, quote.page_url || options.sourceUrl || ORO_DORO_DEFAULT_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit
    }, {
      ...options,
      unit,
      extractionMethod: "ai_oro_doro_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes: dedupeOroDOroQuotes(quotes), warnings: parsed.warnings || [] };
}

export function createOroDOroExtractor(options = {}) {
  const config = {
    url: options.url || ORO_DORO_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
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

    let quotes = dedupeOroDOroQuotes(pages.flatMap((page) => extractOroDOroQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    })));

    if (missingOroDOroDefinitions(quotes).length && runtime.usePlaywright) {
      const rendered = await renderOroDOroPageWithPlaywright(runtime.url, runtime).catch((error) => ({
        page: null,
        warning: error.message || "Rendering Playwright non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.page) {
        pages.push(rendered.page);
        quotes = dedupeOroDOroQuotes(quotes.concat(extractOroDOroQuotesFromText(rendered.page.text, {
          ...runtime,
          sourceUrl: rendered.page.url || runtime.url
        })));
      }
    }

    if (missingOroDOroDefinitions(quotes).length && runtime.useAiFallback && pages.length) {
      const ai = await extractOroDOroQuotesWithAi(pages, {
        ...runtime,
        sourceUrl: runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Oro D'Oro non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length) quotes = dedupeOroDOroQuotes(quotes.concat(ai.quotes));
    }

    for (const definition of missingOroDOroDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Oro D'Oro non rilevato automaticamente.`);
    }

    const requiredCount = ORO_DORO_DEFINITIONS.length;
    const foundCount = requiredCount - missingOroDOroDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "oro_doro",
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
