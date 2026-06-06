import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const AMICO_ORO_DEFAULT_URL = "https://www.amico-oro.it";

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
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: "customer_buyback",
    evidence_text: amicoOroEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      amico_oro_key: definition.key,
      amico_oro_mapping: definition.purity_code
    }
  };
}

export async function fetchAmicoOroPage(url = AMICO_ORO_DEFAULT_URL, options = {}) {
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

function goldRegexForKarat(karat = "") {
  return new RegExp(`\\b${karat}\\s*(?:k|kt|carati|carato)\\b\\s*al\\s*(?:gr|g|grammo|grammi)\\s*[=:]?\\s*(?:€\\s*)?([0-9][0-9.,]*)\\s*(?:€|eur|euro)`, "i");
}

function silverRegexForTitle(title = "") {
  return new RegExp(`\\b${title}\\b\\s*al\\s*(kg|chilogrammo|chilo|kilo|gr|g|grammo|grammi)\\s*[=:]?\\s*(?:€\\s*)?([0-9][0-9.,]*)\\s*(?:€|eur|euro)?`, "i");
}

export function extractAmicoOroQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || AMICO_ORO_DEFAULT_URL;
  const normalized = compactText(text);
  const quotes = [];
  for (const definition of AMICO_ORO_GOLD_DEFINITIONS) {
    const match = normalized.match(goldRegexForKarat(definition.karat));
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!price) continue;
    quotes.push(amicoOroQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: match[0],
      unit: "EUR/g"
    }, options));
  }

  const argentoIndex = normalized.toLowerCase().indexOf("argento");
  const silverText = argentoIndex >= 0 ? normalized.slice(argentoIndex, argentoIndex + 1200) : "";
  if (silverText) {
    for (const definition of AMICO_ORO_SILVER_DEFINITIONS) {
      const match = silverText.match(silverRegexForTitle(definition.title));
      const unit = match ? unitFromText(match[1]) : "EUR/kg";
      const price = match ? parseItalianEuroPrice(match[2]) : 0;
      if (!price) continue;
      quotes.push(amicoOroQuote(definition, price, sourceUrl, {
        source_method: "text_regex",
        matched_text: match[0],
        unit
      }, { ...options, unit }));
    }
  }
  return quotes;
}

async function renderAmicoOroPageWithPlaywright(url = AMICO_ORO_DEFAULT_URL, options = {}) {
  if (!options.usePlaywright) return { quotes: [], warning: "Playwright disattivato." };
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return { quotes: [], warning: "Playwright non disponibile, uso fetch HTML semplice." };
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: options.userAgent || "OroActiveBot/1.0" });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: Number(options.timeoutMs || 15000) });
    await page.waitForTimeout(2500);
    const rendered = await page.evaluate(() => document.body?.innerText || "");
    return {
      quotes: extractAmicoOroQuotesFromText(rendered, { ...options, sourceUrl: page.url() }),
      text: rendered,
      warning: ""
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function extractAmicoOroQuotesWithAi(pageText = "", options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Amico Oro. Devi individuare esclusivamente quotazioni cliente nel testo pubblico: 24K al gr, 18K al gr, 14K al gr e solo eventuale argento chiaramente indicato. Non inventare prezzi. Se un prezzo non e chiaro, non restituirlo. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Amico Oro. Estrai solo quotazioni nel formato tipo:
- 24K al gr = prezzo €
- 18K al gr = prezzo €
- 14K al gr = prezzo €
- eventuale argento 999/925/800 solo se chiaramente indicato

I prezzi sono quotazioni di acquisto al cliente, non prezzi spot. Non inventare dati mancanti.

TESTO:
${String(pageText || "").replace(/\s+/g, " ").trim().slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "amico_oro_quote_extraction",
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
                  purity_code: { type: "string" },
                  purity_value: { type: ["number", "null"] },
                  price: { type: "number" },
                  unit: { type: "string" },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["metal", "purity_code", "purity_value", "price", "unit", "evidence_text", "confidence"]
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
  const allowedDefinitions = [...AMICO_ORO_GOLD_DEFINITIONS, ...AMICO_ORO_SILVER_DEFINITIONS];
  const quotes = (parsed.quotes || []).map((quote) => {
    const definition = allowedDefinitions.find((item) => item.metal === quote.metal && item.purity_code === quote.purity_code);
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || "EUR/g");
    return amicoOroQuote(definition, price, options.sourceUrl || AMICO_ORO_DEFAULT_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit
    }, {
      ...options,
      unit,
      extractionMethod: "ai_amico_oro_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes, warnings: parsed.warnings || [] };
}

export function createAmicoOroExtractor(options = {}) {
  const config = {
    url: options.url || AMICO_ORO_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiVisionFallback: Boolean(options.useAiVisionFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
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

    let quotes = page?.text ? extractAmicoOroQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    }) : [];

    if (quotes.filter((quote) => quote.metal === "gold").length < AMICO_ORO_GOLD_DEFINITIONS.length) {
      const rendered = await renderAmicoOroPageWithPlaywright(runtime.url, runtime).catch((error) => ({
        quotes: [],
        warning: error.message || "Rendering Playwright non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.quotes?.length > quotes.length) quotes = rendered.quotes;
      if (!page?.text && rendered.text) page = { text: rendered.text, url: runtime.url };
    }

    if (quotes.filter((quote) => quote.metal === "gold").length < AMICO_ORO_GOLD_DEFINITIONS.length && page?.text) {
      const ai = await extractAmicoOroQuotesWithAi(page.text, {
        ...runtime,
        sourceUrl: page.url || runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Amico Oro non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length > quotes.length) quotes = ai.quotes;
    }

    if (quotes.filter((quote) => quote.metal === "gold").length < AMICO_ORO_GOLD_DEFINITIONS.length && runtime.useAiVisionFallback && !runtime.openai) {
      warnings.push("AI vision fallback non disponibile.");
    }

    const foundKeys = new Set(quotes.map((quote) => quote.raw_payload?.amico_oro_key));
    for (const definition of AMICO_ORO_GOLD_DEFINITIONS) {
      if (!foundKeys.has(definition.key)) warnings.push(`Prezzo ${definition.label} Amico Oro non rilevato automaticamente.`);
    }
    if (!quotes.some((quote) => quote.metal === "silver")) warnings.push("Dato argento Amico Oro non rilevato automaticamente.");

    const goldCount = quotes.filter((quote) => quote.metal === "gold").length;
    const status = goldCount === AMICO_ORO_GOLD_DEFINITIONS.length
      ? "success"
      : goldCount
        ? "partial"
        : "failed";
    return {
      source: "amico_oro",
      status,
      quotes,
      error: warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings
    };
  }

  return { extractAmicoOroQuotes };
}

export async function extractAmicoOroQuotes(options = {}) {
  return createAmicoOroExtractor(options).extractAmicoOroQuotes(options);
}
