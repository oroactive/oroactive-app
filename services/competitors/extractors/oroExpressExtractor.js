import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const ORO_EXPRESS_DEFAULT_URL = "https://www.oro-express.it";
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

async function fetchOroExpressJson(url = ORO_EXPRESS_DEFAULT_URL, definition = {}, options = {}) {
  const endpoint = new URL("/index.php", url);
  endpoint.searchParams.set("option", "com_oroexpress");
  endpoint.searchParams.set("controller", "controller");
  endpoint.searchParams.set("task", definition.task);
  endpoint.searchParams.set("format", "raw");
  endpoint.searchParams.set("tipo", definition.tipo);
  endpoint.searchParams.set("id_negozio", "null");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
  try {
    const response = await fetch(endpoint.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.5",
        "User-Agent": options.userAgent || "OroActiveBot/1.0"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    return { endpoint: endpoint.toString(), raw, json: JSON.parse(raw) };
  } finally {
    clearTimeout(timeout);
  }
}

function priceFromOroExpressWidgetJson(definition = {}, json = {}) {
  const rawValue = Number(json[definition.valueField] || 0);
  const variation = parseItalianEuroPrice(Array.isArray(json.variazione) ? json.variazione[0] : json.variazione);
  const price = Number(((rawValue * definition.coefficient) - variation).toFixed(2));
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function extractOroExpressQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || ORO_EXPRESS_DEFAULT_URL;
  const normalized = compactText(text);
  const silverUsedMapping = String(options.silverUsedMapping || "generic").toLowerCase();
  const patterns = {
    gold_pure: /Acquistiamo\s+il\s+tuo\s+oro\s+puro\s+a\s+partire\s+da\s+([0-9][0-9.,]*)/i,
    gold_used: /Acquistiamo\s+il\s+tuo\s+oro\s+usato\s+a\s+partire\s+da\s+([0-9][0-9.,]*)/i,
    silver_pure: /Acquistiamo\s+il\s+tuo\s+argento\s+puro\s+a\s+partire\s+da\s+([0-9][0-9.,]*)/i,
    silver_used: /Acquistiamo\s+il\s+tuo\s+argento\s+usato\s+a\s+partire\s+da\s+([0-9][0-9.,]*)/i
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
        response: result.json
      }, options));
    } catch (error) {
      errors.push(`${baseDefinition.label}: ${error.message || "endpoint non leggibile"}`);
    }
  }
  return { quotes, errors };
}

async function renderOroExpressPageWithPlaywright(url = ORO_EXPRESS_DEFAULT_URL, options = {}) {
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
    await page.waitForTimeout(3500);
    const rendered = await page.evaluate(() => ({
      text: document.body?.innerText || "",
      values: {
        gold_pure: document.querySelector(".oro-puro")?.innerText || "",
        gold_used: document.querySelector(".oro-usato")?.innerText || "",
        silver_pure: document.querySelector(".argento-puro")?.innerText || "",
        silver_used: document.querySelector(".argento-usato")?.innerText || ""
      }
    }));
    const silverUsedMapping = String(options.silverUsedMapping || "generic").toLowerCase();
    const quotes = ORO_EXPRESS_QUOTE_DEFINITIONS
      .map((baseDefinition) => {
        const definition = normalizeOroExpressSilverUsed(baseDefinition, silverUsedMapping);
        const price = parseItalianEuroPrice(rendered.values[baseDefinition.key]);
        return price ? oroExpressQuote(definition, price, page.url(), {
          source_method: "playwright_dom",
          rendered_value: rendered.values[baseDefinition.key]
        }, options) : null;
      })
      .filter(Boolean);
    return { quotes, text: rendered.text, warning: "" };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function extractOroExpressQuotesWithAi(pageText = "", options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Oro Express. Devi individuare esclusivamente quattro quotazioni cliente nel testo pubblico: oro puro, oro usato, argento puro, argento usato. Non inventare prezzi. Se un prezzo non e chiaro, restituisci null per quel campo. Restituisci solo JSON valido.";
  const userPrompt = `Estrai solo questi prezzi dal testo pubblico Oro Express:
- oro_puro_eur_g
- oro_usato_eur_g
- argento_puro_eur_g
- argento_usato_eur_g

I prezzi sono quotazioni di acquisto al cliente, non prezzi spot. Non inventare dati mancanti.

TESTO:
${String(pageText || "").replace(/\s+/g, " ").trim().slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "oro_express_quote_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            oro_puro_eur_g: { type: ["number", "null"] },
            oro_usato_eur_g: { type: ["number", "null"] },
            argento_puro_eur_g: { type: ["number", "null"] },
            argento_usato_eur_g: { type: ["number", "null"] },
            warnings: { type: "array", items: { type: "string" } }
          },
          required: ["oro_puro_eur_g", "oro_usato_eur_g", "argento_puro_eur_g", "argento_usato_eur_g", "warnings"]
        }
      }
    }
  });
  const parsed = JSON.parse(response.output_text || "{}");
  const values = {
    gold_pure: parsed.oro_puro_eur_g,
    gold_used: parsed.oro_usato_eur_g,
    silver_pure: parsed.argento_puro_eur_g,
    silver_used: parsed.argento_usato_eur_g
  };
  const silverUsedMapping = String(options.silverUsedMapping || "generic").toLowerCase();
  const quotes = ORO_EXPRESS_QUOTE_DEFINITIONS
    .map((baseDefinition) => {
      const definition = normalizeOroExpressSilverUsed(baseDefinition, silverUsedMapping);
      const price = Number(values[baseDefinition.key] || 0);
      return price > 0 ? oroExpressQuote(definition, price, options.sourceUrl || ORO_EXPRESS_DEFAULT_URL, {
        source_method: "ai_fallback",
        ai_response: parsed
      }, {
        ...options,
        extractionMethod: "ai_oro_express_fallback",
        confidence: "medium",
        aiConfidence: "medium",
        aiExtracted: true
      }) : null;
    })
    .filter(Boolean);
  return { quotes, warnings: parsed.warnings || [] };
}

export function createOroExpressExtractor(options = {}) {
  const config = {
    url: options.url || ORO_EXPRESS_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    silverUsedMapping: options.silverUsedMapping || "generic",
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
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
    let quotes = widget.quotes.length ? widget.quotes : textQuotes;

    if (quotes.length < ORO_EXPRESS_QUOTE_DEFINITIONS.length) {
      const rendered = await renderOroExpressPageWithPlaywright(runtime.url, runtime).catch((error) => ({
        quotes: [],
        warning: error.message || "Rendering Playwright non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.quotes?.length > quotes.length) quotes = rendered.quotes;
      if (!page?.text && rendered.text) page = { text: rendered.text, url: runtime.url };
    }

    if (quotes.length < ORO_EXPRESS_QUOTE_DEFINITIONS.length && page?.text) {
      const ai = await extractOroExpressQuotesWithAi(page.text, {
        ...runtime,
        sourceUrl: page.url || runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Oro Express non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length > quotes.length) quotes = ai.quotes;
    }

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
      status,
      quotes,
      error: warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings
    };
  }

  return { extractOroExpressQuotes };
}

export async function extractOroExpressQuotes(options = {}) {
  return createOroExpressExtractor(options).extractOroExpressQuotes(options);
}
