import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const BANCO_PREZIOSI_DEFAULT_URL = "https://www.bancopreziosimilano.it";
const BANCO_PREZIOSI_DEFAULT_QUOTE_URL = "https://www.bancopreziosimilano.it/quotazioni";

const BANCO_PREZIOSI_DEFINITIONS = [
  {
    key: "gold_24kt_reference",
    label: "Quotazione ufficiale oro",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "reference_official_gold_price",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_18kt",
    label: "Oro 18kt",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    quote_type: "customer_buyback",
    defaultUnit: "EUR/g"
  },
  {
    key: "silver_925",
    label: "Argento 925",
    metal: "silver",
    purity_code: "925",
    purity_value: 0.925,
    quote_type: "customer_buyback",
    defaultUnit: "EUR/kg"
  },
  {
    key: "silver_800",
    label: "Argento 800",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    quote_type: "customer_buyback",
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

function unitFromText(value = "", fallback = "EUR/g") {
  const text = String(value || fallback || "").toLowerCase();
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

function quoteKey(quote = {}) {
  return `${quote.metal}:${quote.purity_code}:${quote.quote_type}`;
}

function isQuotePage(url = "") {
  return /quotazioni/i.test(String(url || ""));
}

function isLegacyQuotePost(url = "") {
  return /quotazioni-oro-in-tempo-reale-milano/i.test(String(url || ""));
}

function isPublicHomeQuoteSource(url = "") {
  try {
    const parsed = new URL(String(url || ""), BANCO_PREZIOSI_DEFAULT_URL);
    return /bancopreziosimilano\.it$/i.test(parsed.hostname) && (!parsed.pathname || parsed.pathname === "/");
  } catch {
    return false;
  }
}

function quoteSourcePriority(quote = {}) {
  const sourceUrl = quote.source_url || quote.url || "";
  const sourceMethod = quote.raw_payload?.source_method || "";
  if (sourceMethod === "public_home_quote_section") return 100;
  if (isPublicHomeQuoteSource(sourceUrl)) return 90;
  if (isLegacyQuotePost(sourceUrl)) return 20;
  if (isQuotePage(sourceUrl)) return 40;
  return 50;
}

function bancoDefinition(key = "") {
  return BANCO_PREZIOSI_DEFINITIONS.find((item) => item.key === key) || {};
}

function bancoPreziosiEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  if (definition.key === "gold_24kt_reference") return `QUOTAZIONE UFFICIALE ORO euro ${formatEvidencePrice(price, "EUR/g").replace("€/g", "al grammo")}`;
  if (definition.key === "gold_18kt") return `ACQUISTIAMO ORO 18K euro ${formatEvidencePrice(price, "EUR/g").replace("€/g", "al grammo")}`;
  return `${definition.label} ${formatEvidencePrice(price, unit)}`;
}

function bancoPreziosiQuote(definition = {}, price = 0, sourceUrl = BANCO_PREZIOSI_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Banco Preziosi",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_banco_preziosi_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: definition.quote_type,
    evidence_text: bancoPreziosiEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      banco_preziosi_key: definition.key,
      banco_preziosi_mapping: definition.purity_code,
      banco_preziosi_quote_type: definition.quote_type
    }
  };
}

function addRegexQuote(quotes = [], text = "", definitionKey = "", regexes = [], sourceUrl = BANCO_PREZIOSI_DEFAULT_URL, options = {}) {
  const definition = bancoDefinition(definitionKey);
  for (const regex of regexes) {
    const match = text.match(regex);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!price) continue;
    const unit = unitFromText(match[2] || definition.defaultUnit, definition.defaultUnit);
    const sourceMethod = isPublicHomeQuoteSource(sourceUrl) ? "public_home_quote_section" : "text_regex";
    quotes.push(bancoPreziosiQuote(definition, price, sourceUrl, {
      source_method: sourceMethod,
      matched_text: match[0],
      unit
    }, {
      ...options,
      unit,
      extractionMethod: options.extractionMethod || "auto_banco_preziosi_parser",
      confidence: options.confidence || (sourceMethod === "public_home_quote_section" ? "high" : undefined)
    }));
    return true;
  }
  return false;
}

function addHomepageFallbackQuotes(quotes = [], text = "", sourceUrl = BANCO_PREZIOSI_DEFAULT_URL, options = {}) {
  const existing = new Set(quotes.map(quoteKey));
  if (existing.has("gold:24kt:reference_official_gold_price") && existing.has("gold:18kt:customer_buyback")) return;
  const quoteBoxText = text.match(/(?:contatti|menu)[\s\S]{0,1500}?i\s+prezzi\s+indicati\s+sono\s+netti\s+al\s+cliente/i)?.[0] || text.slice(0, 1600);
  const matches = [...quoteBoxText.matchAll(/euro\s*([0-9][0-9.,]*)\s*al\s*(grammo|gr|g)\b/gi)]
    .map((match) => ({
      price: parseItalianEuroPrice(match[1]),
      evidence: match[0]
    }))
    .filter((item) => item.price > 0);
  if (matches.length >= 1 && !existing.has("gold:24kt:reference_official_gold_price")) {
    quotes.push(bancoPreziosiQuote(bancoDefinition("gold_24kt_reference"), matches[0].price, sourceUrl, {
      source_method: "homepage_quote_box_sequence",
      matched_text: `Riquadro homepage Banco Preziosi: ${matches[0].evidence}`,
      unit: "EUR/g"
    }, options));
  }
  if (matches.length >= 2 && !existing.has("gold:18kt:customer_buyback")) {
    quotes.push(bancoPreziosiQuote(bancoDefinition("gold_18kt"), matches[1].price, sourceUrl, {
      source_method: "homepage_quote_box_sequence",
      matched_text: `Riquadro homepage Banco Preziosi: ${matches[1].evidence} · i prezzi indicati sono netti al cliente`,
      unit: "EUR/g"
    }, options));
  }
}

export function extractBancoPreziosiQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || BANCO_PREZIOSI_DEFAULT_URL;
  const normalized = compactText(decodeHtml(text));
  const quotes = [];

  addRegexQuote(quotes, normalized, "gold_24kt_reference", [
    /QUOTAZIONE\s+UFFICIALE\s+ORO[\s\S]{0,140}?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(grammo|gr|g)\b/i,
    /Quotazioni\s+Ufficiali\s+ORO(?:\s+e\s+ARGENTO)?[\s\S]{0,180}?Valore\s+di\s+acquisto\s+ORO[\s\S]{0,80}?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(grammo|gr|g)\b/i,
    /Valore\s+di\s+acquisto\s+ORO[\s\S]{0,80}?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(grammo|gr|g)\b/i
  ], sourceUrl, options);

  addRegexQuote(quotes, normalized, "gold_18kt", [
    /ACQUISTIAMO\s+ORO\s+18\s*k(?:t)?[\s\S]{0,140}?(?:a\s*)?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(grammo|gr|g)\b/i,
    /ORO\s*18\s*kt[\s\S]{0,100}?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(grammo|gr|g)\b/i
  ], sourceUrl, options);

  addRegexQuote(quotes, normalized, "silver_925", [
    /(?:ACQUISTIAMO\s+)?ARGENTO\s*925[\s\S]{0,110}?(?:a\s*)?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(kg|chilogrammo|kilo)\b/i
  ], sourceUrl, { ...options, unit: "EUR/kg" });

  addRegexQuote(quotes, normalized, "silver_800", [
    /(?:ACQUISTIAMO\s+)?ARGENTO\s*800[\s\S]{0,110}?(?:a\s*)?(?:euro|€)\s*([0-9][0-9.,]*)\s*(?:al|\/)?\s*(kg|chilogrammo|kilo)\b/i
  ], sourceUrl, { ...options, unit: "EUR/kg" });

  if (!isQuotePage(sourceUrl)) addHomepageFallbackQuotes(quotes, normalized, sourceUrl, options);
  return dedupeBancoPreziosiQuotes(quotes);
}

export function dedupeBancoPreziosiQuotes(quotes = [], warnings = []) {
  const map = new Map();
  for (const quote of quotes) {
    const key = quoteKey(quote);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, quote);
      continue;
    }
    const existingPrice = Number(existing.price_per_gram || 0);
    const nextPrice = Number(quote.price_per_gram || 0);
    if (existingPrice && nextPrice && Math.abs(existingPrice - nextPrice) > 0.0001 && quote.purity_code === "18kt") {
      warnings.push("Prezzo oro 18kt diverso tra homepage e pagina quotazioni.");
    }
    const preferNext = quoteSourcePriority(quote) > quoteSourcePriority(existing);
    const chosen = preferNext ? quote : existing;
    const other = preferNext ? existing : quote;
    map.set(key, {
      ...chosen,
      evidence_text: chosen.evidence_text || other.evidence_text,
      raw_payload: {
        ...(chosen.raw_payload || {}),
        alternate_evidence_text: [chosen.raw_payload?.alternate_evidence_text, other.evidence_text].flat().filter(Boolean).slice(0, 4),
        alternate_source_url: [chosen.raw_payload?.alternate_source_url, other.source_url].flat().filter(Boolean).slice(0, 4)
      }
    });
  }
  return [...map.values()];
}

export async function fetchBancoPreziosiPage(url = BANCO_PREZIOSI_DEFAULT_URL, options = {}) {
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

function resolveBancoUrl(href = "", baseUrl = BANCO_PREZIOSI_DEFAULT_URL) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    if (!/bancopreziosimilano\.it$/i.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function discoverBancoPreziosiQuoteUrls(html = "", baseUrl = BANCO_PREZIOSI_DEFAULT_URL, explicitQuoteUrl = BANCO_PREZIOSI_DEFAULT_QUOTE_URL) {
  const urls = [explicitQuoteUrl, `${BANCO_PREZIOSI_DEFAULT_URL}/quotazioni`, `${BANCO_PREZIOSI_DEFAULT_URL}/quotazioni/`];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = linkRegex.exec(String(html || "")))) {
    const href = match[1] || "";
    const label = extractReadableTextFromHtml(match[2] || "");
    if (!/quotazioni/i.test(`${href} ${label}`)) continue;
    const resolved = resolveBancoUrl(href, baseUrl);
    if (resolved) urls.unshift(resolved);
  }
  return [...new Set(urls.map((url) => resolveBancoUrl(url, baseUrl)).filter(Boolean))].slice(0, 5);
}

async function renderBancoPreziosiPageWithPlaywright(url = BANCO_PREZIOSI_DEFAULT_URL, options = {}) {
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
    const acceptButton = page.getByText("ACCETTO", { exact: false });
    if (await acceptButton.count().catch(() => 0)) {
      await acceptButton.click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(1500);
    const rendered = await page.evaluate(() => document.body?.innerText || "");
    return {
      page: {
        url: page.url() || url,
        html: "",
        text: rendered,
        method: "playwright"
      },
      warning: ""
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function extractBancoPreziosiQuotesWithAi(pageTexts = [], options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Banco Preziosi. Devi estrarre solo quotazioni chiaramente visibili: quotazione ufficiale oro al grammo, oro 18kt al grammo, argento 925 al kg, argento 800 al kg. Non inventare dati. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Banco Preziosi. Estrai solo:
1. Quotazione ufficiale oro al grammo
2. Acquistiamo oro 18K / ORO 18kt al grammo
3. ARGENTO 925 al KG
4. ARGENTO 800 al KG

Se un prezzo non e chiaramente presente, non restituirlo. Il 24kt ufficiale deve avere quote_type reference_official_gold_price. Gli altri sono customer_buyback.

TESTO:
${pageTexts.map((page) => `URL: ${page.url}\n${String(page.text || "").replace(/\s+/g, " ").trim()}`).join("\n\n---\n\n").slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "banco_preziosi_quote_extraction",
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
                  purity_value: { type: "number" },
                  price: { type: "number" },
                  unit: { type: "string" },
                  quote_type: { type: "string", enum: ["customer_buyback", "reference_official_gold_price"] },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  page_url: { type: "string" }
                },
                required: ["metal", "purity_code", "purity_value", "price", "unit", "quote_type", "evidence_text", "confidence", "page_url"]
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
    const definition = BANCO_PREZIOSI_DEFINITIONS.find((item) => (
      item.metal === quote.metal
      && item.purity_code === quote.purity_code
      && item.quote_type === quote.quote_type
    ));
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || definition.defaultUnit, definition.defaultUnit);
    return bancoPreziosiQuote(definition, price, quote.page_url || options.sourceUrl || BANCO_PREZIOSI_DEFAULT_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit
    }, {
      ...options,
      unit,
      extractionMethod: "ai_banco_preziosi_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes: dedupeBancoPreziosiQuotes(quotes), warnings: parsed.warnings || [] };
}

function missingBancoDefinitions(quotes = []) {
  const found = new Set(quotes.map((quote) => quote.raw_payload?.banco_preziosi_key).filter(Boolean));
  return BANCO_PREZIOSI_DEFINITIONS.filter((definition) => !found.has(definition.key));
}

export function createBancoPreziosiExtractor(options = {}) {
  const config = {
    url: options.url || BANCO_PREZIOSI_DEFAULT_URL,
    quoteUrl: options.quoteUrl || BANCO_PREZIOSI_DEFAULT_QUOTE_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
  };

  async function extractBancoPreziosiQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchBancoPreziosiPage(runtime.url, runtime);
      pages.push(homepage);
      const quoteUrls = discoverBancoPreziosiQuoteUrls(homepage.html, homepage.url || runtime.url, runtime.quoteUrl);
      for (const quoteUrl of quoteUrls) {
        if (pages.some((page) => page.url === quoteUrl)) continue;
        const page = await fetchBancoPreziosiPage(quoteUrl, runtime).catch((error) => {
          warnings.push(`Pagina quotazioni Banco Preziosi non leggibile ${quoteUrl}: ${error.message || "errore fetch"}`);
          return null;
        });
        if (page) pages.push(page);
        if (pages.length >= 4) break;
      }
    } catch (error) {
      warnings.push(`Homepage Banco Preziosi non leggibile: ${error.message || "errore fetch"}`);
    }

    let quotes = dedupeBancoPreziosiQuotes(pages.flatMap((page) => extractBancoPreziosiQuotesFromText(page.text, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    })), warnings);

    if (missingBancoDefinitions(quotes).length && runtime.usePlaywright) {
      for (const url of [runtime.url, runtime.quoteUrl]) {
        const rendered = await renderBancoPreziosiPageWithPlaywright(url, runtime).catch((error) => ({
          page: null,
          warning: error.message || "Rendering Playwright non riuscito."
        }));
        if (rendered.warning) warnings.push(rendered.warning);
        if (!rendered.page) continue;
        pages.push(rendered.page);
        quotes = dedupeBancoPreziosiQuotes(quotes.concat(extractBancoPreziosiQuotesFromText(rendered.page.text, {
          ...runtime,
          sourceUrl: rendered.page.url || url
        })), warnings);
        if (!missingBancoDefinitions(quotes).length) break;
      }
    }

    if (missingBancoDefinitions(quotes).length && runtime.useAiFallback) {
      const ai = await extractBancoPreziosiQuotesWithAi(pages, {
        ...runtime,
        sourceUrl: runtime.quoteUrl || runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Banco Preziosi non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length) quotes = dedupeBancoPreziosiQuotes(quotes.concat(ai.quotes), warnings);
    }

    for (const definition of missingBancoDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Banco Preziosi non rilevato automaticamente.`);
    }

    const requiredCount = BANCO_PREZIOSI_DEFINITIONS.length;
    const foundCount = requiredCount - missingBancoDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    const uniqueWarnings = [...new Set(warnings.filter(Boolean))];
    return {
      source: "banco_preziosi",
      status,
      quotes,
      error: status === "success" ? "" : uniqueWarnings.join(" | ").slice(0, 1200),
      warnings: uniqueWarnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractBancoPreziosiQuotes };
}

export async function extractBancoPreziosiQuotes(options = {}) {
  return createBancoPreziosiExtractor(options).extractBancoPreziosiQuotes(options);
}
