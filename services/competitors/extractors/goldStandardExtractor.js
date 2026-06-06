import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const GOLD_STANDARD_DEFAULT_URL = "https://www.goldstandard.gold";
const GOLD_STANDARD_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const GOLD_STANDARD_DEFINITIONS = [
  {
    key: "gold_standard_gold_24kt_reference",
    label: "Quotazione dell'oro in borsa",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "reference_market_gold_price",
    required: true,
    anchor: "Quotazione dell'oro in borsa",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_standard_gold_18kt_buyback",
    label: "Acquistiamo ORO 18K prezzo MIN",
    metal: "gold",
    purity_code: "18kt",
    purity_value: 0.75,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Acquistiamo ORO 18K",
    price_kind: "min_price",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_standard_gold_24kt_buyback",
    label: "Acquistiamo ORO 24K al prezzo MIN",
    metal: "gold",
    purity_code: "24kt",
    purity_value: 1,
    quote_type: "customer_buyback",
    required: true,
    anchor: "Acquistiamo ORO 24K",
    price_kind: "min_price",
    defaultUnit: "EUR/g"
  },
  {
    key: "gold_standard_silver_reference",
    label: "Quotazione dell'argento in borsa",
    metal: "silver",
    purity_code: "999",
    purity_value: 0.999,
    quote_type: "reference_market_silver_price",
    required: false,
    anchor: "Quotazione dell'argento in borsa",
    defaultUnit: "EUR/kg"
  },
  {
    key: "gold_standard_silver_925_buyback",
    label: "Acquistiamo ARGENTO 925 al chilo",
    metal: "silver",
    purity_code: "925",
    purity_value: 0.925,
    quote_type: "customer_buyback",
    required: false,
    anchor: "Acquistiamo ARGENTO 925",
    price_kind: "min_price",
    defaultUnit: "EUR/kg"
  },
  {
    key: "gold_standard_silver_800_buyback",
    label: "Acquistiamo ARGENTO 800 al chilo",
    metal: "silver",
    purity_code: "800",
    purity_value: 0.8,
    quote_type: "customer_buyback",
    required: false,
    anchor: "Acquistiamo ARGENTO 800",
    price_kind: "min_price",
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

function pricePattern() {
  return "(?:€\\s*)?([0-9][0-9.,]*)\\s*(?:€|eur|euro)?";
}

function currencyPriceRegex() {
  return /(?:€\s*([0-9][0-9.,]*)|([0-9][0-9.,]*)\s*(?:€|eur|euro))/i;
}

function goldStandardEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  return `${definition.label}: ${formatEvidencePrice(price, unit)}`;
}

function goldStandardQuote(definition = {}, price = 0, sourceUrl = GOLD_STANDARD_DEFAULT_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || new Date().toISOString();
  return {
    source_id: options.source_id || options.sourceId || null,
    competitor_name: "Gold Standard",
    metal: definition.metal,
    purity_code: definition.purity_code,
    purity_value: definition.purity_value,
    price_per_gram: priceGram,
    price_per_kg: unit === "EUR/kg" ? Number(price || 0) : priceGram * 1000,
    currency: "EUR",
    quote_date: quoteDate,
    extraction_method: options.extractionMethod || "auto_gold_standard_parser",
    confidence: options.confidence || "high",
    ai_confidence: options.aiConfidence || options.confidence || "high",
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: definition.quote_type,
    evidence_text: goldStandardEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
      gold_standard_key: definition.key,
      gold_standard_mapping: definition.purity_code,
      gold_standard_quote_type: definition.quote_type,
      price_kind: definition.price_kind || rawPayload.price_kind || null
    }
  };
}

function regexesForDefinition(definition = {}) {
  const price = pricePattern();
  if (definition.key === "gold_standard_gold_24kt_reference") {
    return [
      new RegExp(`Quotazione\\s+dell[’']\\s*oro\\s+in\\s+borsa[\\s\\S]{0,140}?${price}`, "i"),
      new RegExp(`Quotazione[\\s\\S]{0,40}?oro\\s+in\\s+borsa[\\s\\S]{0,140}?${price}`, "i")
    ];
  }
  if (definition.key === "gold_standard_gold_18kt_buyback") {
    return [
      new RegExp(`Acquistiamo\\s+ORO\\s*18\\s*K(?:T)?[\\s\\S]{0,140}?(?:prezzo\\s*(?:MIN|minimo)|al\\s+prezzo\\s*(?:MIN|minimo))[\\s\\S]{0,90}?${price}`, "i"),
      new RegExp(`Acquistiamo\\s+ORO\\s*18\\s*K(?:T)?[\\s\\S]{0,220}?${price}`, "i")
    ];
  }
  if (definition.key === "gold_standard_gold_24kt_buyback") {
    return [
      new RegExp(`Acquistiamo\\s+ORO\\s*24\\s*K(?:T)?[\\s\\S]{0,140}?(?:prezzo\\s*(?:MIN|minimo)|al\\s+prezzo\\s*(?:MIN|minimo))[\\s\\S]{0,90}?${price}`, "i"),
      new RegExp(`Acquistiamo\\s+ORO\\s*24\\s*K(?:T)?[\\s\\S]{0,220}?${price}`, "i")
    ];
  }
  if (definition.key === "gold_standard_silver_reference") {
    return [
      new RegExp(`Quotazione\\s+dell[’']\\s*argento\\s+in\\s+borsa[\\s\\S]{0,140}?${price}`, "i"),
      new RegExp(`Quotazione[\\s\\S]{0,40}?argento\\s+in\\s+borsa[\\s\\S]{0,140}?${price}`, "i")
    ];
  }
  if (definition.key === "gold_standard_silver_925_buyback") {
    return [
      new RegExp(`Acquistiamo\\s+ARGENTO\\s*925[\\s\\S]{0,120}?(?:al\\s+chilo|kg|kilo|chilogrammo)[\\s\\S]{0,80}?${price}`, "i"),
      new RegExp(`Acquistiamo\\s+ARGENTO\\s*925[\\s\\S]{0,220}?${price}`, "i")
    ];
  }
  if (definition.key === "gold_standard_silver_800_buyback") {
    return [
      new RegExp(`Acquistiamo\\s+ARGENTO\\s*800[\\s\\S]{0,120}?(?:al\\s+chilo|kg|kilo|chilogrammo)[\\s\\S]{0,80}?${price}`, "i"),
      new RegExp(`Acquistiamo\\s+ARGENTO\\s*800[\\s\\S]{0,220}?${price}`, "i")
    ];
  }
  return [];
}

function addRegexQuote(quotes = [], text = "", definition = {}, sourceUrl = GOLD_STANDARD_DEFAULT_URL, options = {}) {
  for (const regex of regexesForDefinition(definition)) {
    const match = text.match(regex);
    const price = match ? parseItalianEuroPrice(match[1]) : 0;
    if (!price) continue;
    const unit = definition.defaultUnit || "EUR/g";
    quotes.push(goldStandardQuote(definition, price, sourceUrl, {
      source_method: "text_regex",
      matched_text: match[0],
      unit
    }, { ...options, unit }));
    return true;
  }
  return false;
}

export function extractPriceNearAnchor(text = "", anchor = "", maxDistance = 240) {
  const source = String(text || "");
  const anchorRegex = new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*").replace(/'/g, "[’']"), "i");
  const anchorMatch = source.match(anchorRegex);
  if (!anchorMatch || anchorMatch.index === undefined) return null;
  const snippet = source.slice(anchorMatch.index, anchorMatch.index + maxDistance);
  const priceMatch = snippet.match(currencyPriceRegex());
  const price = priceMatch ? parseItalianEuroPrice(priceMatch[1] || priceMatch[2]) : 0;
  if (!price) return null;
  return {
    value: price,
    evidenceText: compactText(snippet.slice(0, priceMatch.index + priceMatch[0].length)).slice(0, 700)
  };
}

function addAnchorFallbackQuote(quotes = [], text = "", definition = {}, sourceUrl = GOLD_STANDARD_DEFAULT_URL, options = {}) {
  if (quotes.some((quote) => quoteKey(quote) === `${definition.metal}:${definition.purity_code}:${definition.quote_type}`)) return false;
  const found = extractPriceNearAnchor(text, definition.anchor || definition.label, 260);
  if (!found?.value) return false;
  const unit = definition.defaultUnit || "EUR/g";
  quotes.push(goldStandardQuote(definition, found.value, sourceUrl, {
    source_method: "anchor_near_price",
    matched_text: found.evidenceText,
    unit
  }, { ...options, unit }));
  return true;
}

export function extractGoldStandardQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || GOLD_STANDARD_DEFAULT_URL;
  const normalized = compactText(decodeHtml(text));
  const quotes = [];
  for (const definition of GOLD_STANDARD_DEFINITIONS) {
    const found = addRegexQuote(quotes, normalized, definition, sourceUrl, options);
    if (!found) addAnchorFallbackQuote(quotes, normalized, definition, sourceUrl, options);
  }
  return dedupeGoldStandardQuotes(quotes);
}

function dedupeGoldStandardQuotes(quotes = []) {
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

export async function fetchGoldStandardPage(url = GOLD_STANDARD_DEFAULT_URL, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
  try {
    const requestHeaders = (userAgent) => ({
      Accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.6",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
      "User-Agent": userAgent
    });
    let response = await fetch(url, {
      signal: controller.signal,
      headers: requestHeaders(options.userAgent || "OroActiveBot/1.0")
    });
    if (response.status === 403 && (options.userAgent || "OroActiveBot/1.0") !== GOLD_STANDARD_BROWSER_USER_AGENT) {
      response = await fetch(url, {
        signal: controller.signal,
        headers: requestHeaders(GOLD_STANDARD_BROWSER_USER_AGENT)
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

function resolveGoldStandardUrl(href = "", baseUrl = GOLD_STANDARD_DEFAULT_URL) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    if (!/(\.|^)goldstandard\.gold$/i.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function discoverGoldStandardQuoteUrls(html = "", baseUrl = GOLD_STANDARD_DEFAULT_URL) {
  const urls = [baseUrl];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = null;
  while ((match = linkRegex.exec(String(html || "")))) {
    const href = match[1] || "";
    const label = extractReadableTextFromHtml(match[2] || "");
    if (!/(quotazione|oro\s*usato|compro\s*oro|oro)/i.test(`${href} ${label}`)) continue;
    const resolved = resolveGoldStandardUrl(href, baseUrl);
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls.map((url) => resolveGoldStandardUrl(url, baseUrl)).filter(Boolean))].slice(0, 5);
}

async function renderGoldStandardPageWithPlaywright(url = GOLD_STANDARD_DEFAULT_URL, options = {}) {
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
  const found = new Set(quotes.map((quote) => quote.raw_payload?.gold_standard_key).filter(Boolean));
  return GOLD_STANDARD_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}

async function extractGoldStandardQuotesWithAi(pageTexts = [], options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback Gold Standard non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Gold Standard. Devi estrarre solo quotazioni chiaramente visibili nel riquadro prezzi: quotazione dell'oro in borsa, Acquistiamo ORO 18K prezzo MIN, Acquistiamo ORO 24K al prezzo MIN. Non inventare dati. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Gold Standard. Estrai solo:
1. Quotazione dell'oro in borsa
2. Acquistiamo ORO 18K prezzo MIN
3. Acquistiamo ORO 24K al prezzo MIN
Eventuali quotazioni argento solo se esplicite.

TESTO:
${pageTexts.map((page) => `URL: ${page.url}\n${String(page.text || "").replace(/\s+/g, " ").trim()}`).join("\n\n---\n\n").slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "gold_standard_quote_extraction",
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
                  quote_type: { type: "string", enum: ["customer_buyback", "reference_market_gold_price", "reference_market_silver_price"] },
                  price_kind: { type: ["string", "null"] },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  page_url: { type: "string" }
                },
                required: ["metal", "purity_code", "purity_value", "price", "unit", "quote_type", "price_kind", "evidence_text", "confidence", "page_url"]
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
    const definition = GOLD_STANDARD_DEFINITIONS.find((item) => (
      item.metal === quote.metal
      && item.purity_code === quote.purity_code
      && item.quote_type === quote.quote_type
    ));
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
    return goldStandardQuote(definition, price, quote.page_url || options.sourceUrl || GOLD_STANDARD_DEFAULT_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit,
      price_kind: quote.price_kind || definition.price_kind || null
    }, {
      ...options,
      unit,
      extractionMethod: "ai_gold_standard_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes: dedupeGoldStandardQuotes(quotes), warnings: parsed.warnings || [] };
}

export function createGoldStandardExtractor(options = {}) {
  const config = {
    url: options.url || GOLD_STANDARD_DEFAULT_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
  };

  async function extractGoldStandardQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchGoldStandardPage(runtime.url, runtime);
      pages.push(homepage);
      const quoteUrls = discoverGoldStandardQuoteUrls(homepage.html, homepage.url || runtime.url);
      for (const quoteUrl of quoteUrls) {
        if (pages.some((page) => page.url === quoteUrl)) continue;
        const page = await fetchGoldStandardPage(quoteUrl, runtime).catch((error) => {
          warnings.push(`Pagina Gold Standard non leggibile ${quoteUrl}: ${error.message || "errore fetch"}`);
          return null;
        });
        if (page) pages.push(page);
        if (pages.length >= 5) break;
      }
    } catch (error) {
      warnings.push(`Homepage Gold Standard non leggibile: ${error.message || "errore fetch"}`);
    }

    let quotes = dedupeGoldStandardQuotes(pages.flatMap((page) => extractGoldStandardQuotesFromText(`${page.text}\n${page.html || ""}`, {
      ...runtime,
      sourceUrl: page.url || runtime.url
    })));

    if (requiredMissingDefinitions(quotes).length && runtime.usePlaywright) {
      const rendered = await renderGoldStandardPageWithPlaywright(runtime.url, runtime).catch((error) => ({
        page: null,
        warning: error.message || "Rendering Playwright Gold Standard non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.page) {
        pages.push(rendered.page);
        quotes = dedupeGoldStandardQuotes(quotes.concat(extractGoldStandardQuotesFromText(rendered.page.text, {
          ...runtime,
          sourceUrl: rendered.page.url || runtime.url
        })));
      }
    }

    if (requiredMissingDefinitions(quotes).length && runtime.useAiFallback) {
      const ai = await extractGoldStandardQuotesWithAi(pages, {
        ...runtime,
        sourceUrl: runtime.url
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Gold Standard non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length) quotes = dedupeGoldStandardQuotes(quotes.concat(ai.quotes));
    }

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Gold Standard non rilevato automaticamente.`);
    }

    const requiredCount = GOLD_STANDARD_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "gold_standard",
      status,
      quotes,
      error: status === "success" ? "" : warnings.filter(Boolean).join(" | ").slice(0, 1200),
      warnings,
      pages_analyzed: pages.map((page) => page.url)
    };
  }

  return { extractGoldStandardQuotes };
}

export async function extractGoldStandardQuotes(options = {}) {
  return createGoldStandardExtractor(options).extractGoldStandardQuotes(options);
}
