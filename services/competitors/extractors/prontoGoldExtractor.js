import { extractReadableTextFromHtml } from "../aiCompetitorQuoteExtractor.js";

const PRONTO_GOLD_DEFAULT_URL = "https://www.prontogold.com";
const PRONTO_GOLD_QUOTE_URL = "https://www.prontogold.com/quotazioni";
const PRONTO_GOLD_BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

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

function pricePattern() {
  return "([0-9][0-9.,]*)\\s*(?:€|eur|euro)?\\s*(?:\\/\\s*)?(?:Grammo|grammo|grammi|g|gr)?";
}

function findAnchorSnippet(text = "", anchor = "", maxDistance = 460) {
  const source = String(text || "");
  const anchorRegex = new RegExp(escapeRegex(anchor), "i");
  const anchorMatch = source.match(anchorRegex);
  if (!anchorMatch || anchorMatch.index === undefined) return "";
  return source.slice(anchorMatch.index, anchorMatch.index + maxDistance);
}

export function parseProntoGoldProviderTimestamp(text = "") {
  const normalized = compactText(decodeHtml(text));
  const match = normalized.match(/Aggiornamento:\s*([a-zàèéìòù]+)?\s*(\d{2})-(\d{2})-(\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})/i);
  if (!match) return { text: "", iso: null };
  const [, day = "", dd, mm, yy, hh, min, ss] = match;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  const date = new Date(Date.UTC(year, Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)));
  return {
    text: compactText(`${day} ${dd}-${mm}-${yy} ${hh}:${min}:${ss}`),
    iso: Number.isNaN(date.getTime()) ? null : date.toISOString()
  };
}

function parseLabelPrice(snippet = "", label = "") {
  const regex = new RegExp(`${escapeRegex(label)}\\s*${pricePattern()}`, "i");
  const match = snippet.match(regex);
  if (!match) return null;
  const price = parseItalianEuroPrice(match[1]);
  if (!price) return null;
  return {
    value: price,
    evidenceText: compactText(snippet.slice(0, match.index + match[0].length)).slice(0, 700),
    unit: unitFromText(match[0], "EUR/g")
  };
}

function parseFirstPrice(snippet = "") {
  const regex = new RegExp(pricePattern(), "i");
  const match = snippet.match(regex);
  if (!match) return null;
  const price = parseItalianEuroPrice(match[1]);
  if (!price) return null;
  return {
    value: price,
    evidenceText: compactText(snippet.slice(0, match.index + match[0].length)).slice(0, 700),
    unit: unitFromText(match[0], "EUR/g")
  };
}

function parseRangePrice(snippet = "") {
  const regex = new RegExp(`\\bda\\s*${pricePattern()}[\\s\\S]{0,120}?\\ba\\s*${pricePattern()}`, "i");
  const match = snippet.match(regex);
  if (!match) return null;
  const min = parseItalianEuroPrice(match[1]);
  const max = parseItalianEuroPrice(match[2]);
  if (!min || !max) return null;
  return {
    value: Math.max(min, max),
    min,
    max,
    evidenceText: compactText(snippet.slice(0, match.index + match[0].length)).slice(0, 700),
    unit: unitFromText(match[0], "EUR/g")
  };
}

function prontoGoldEvidence(definition = {}, price = 0, unit = "EUR/g", matchedText = "") {
  if (matchedText) return compactText(matchedText).slice(0, 700);
  return `${definition.label}: ${formatEvidencePrice(price, unit)}`;
}

function prontoGoldQuote(definition = {}, price = 0, sourceUrl = PRONTO_GOLD_QUOTE_URL, rawPayload = {}, options = {}) {
  const unit = unitFromText(options.unit || rawPayload.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
  const priceGram = pricePerGram(price, unit);
  const quoteDate = options.quoteDate || rawPayload.provider_timestamp || new Date().toISOString();
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
    ai_extracted: Boolean(options.aiExtracted),
    quote_type: definition.quote_type,
    evidence_text: prontoGoldEvidence(definition, price, unit, rawPayload.matched_text),
    url: sourceUrl,
    source_url: sourceUrl,
    raw_payload: {
      ...rawPayload,
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

function quoteForDefinition(text = "", definition = {}, sourceUrl = PRONTO_GOLD_QUOTE_URL, options = {}) {
  const snippet = findAnchorSnippet(text, definition.anchor || definition.label, definition.key.includes("18kt") ? 520 : 420);
  if (!snippet) return null;
  let parsed = null;
  if (definition.price_kind === "range") parsed = parseRangePrice(snippet);
  else if (definition.priceLabel) parsed = parseLabelPrice(snippet, definition.priceLabel);
  else parsed = parseFirstPrice(snippet);
  if (!parsed?.value) return null;
  const provider = options.providerTimestamp || {};
  return prontoGoldQuote(definition, parsed.value, sourceUrl, {
    source_method: "text_regex",
    matched_text: parsed.evidenceText,
    unit: parsed.unit || definition.defaultUnit || "EUR/g",
    provider_timestamp_text: provider.text || "",
    provider_timestamp: provider.iso || null,
    range_min_per_gram: parsed.min || null,
    range_max_per_gram: parsed.max || null,
    price_kind: definition.price_kind || null
  }, {
    ...options,
    quoteDate: provider.iso || options.quoteDate || new Date().toISOString(),
    unit: parsed.unit || definition.defaultUnit || "EUR/g"
  });
}

export function extractProntoGoldQuotesFromText(text = "", options = {}) {
  const sourceUrl = options.sourceUrl || PRONTO_GOLD_QUOTE_URL;
  const normalized = compactText(decodeHtml(text));
  const providerTimestamp = parseProntoGoldProviderTimestamp(normalized);
  const quotes = [];
  for (const definition of PRONTO_GOLD_DEFINITIONS) {
    const quote = quoteForDefinition(normalized, definition, sourceUrl, {
      ...options,
      providerTimestamp
    });
    if (quote) quotes.push(quote);
  }
  return dedupeProntoGoldQuotes(quotes);
}

function dedupeProntoGoldQuotes(quotes = []) {
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

export async function fetchProntoGoldPage(url = PRONTO_GOLD_DEFAULT_URL, options = {}) {
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
    if ([403, 406, 429].includes(response.status) && (options.userAgent || "OroActiveBot/1.0") !== PRONTO_GOLD_BROWSER_USER_AGENT) {
      response = await fetch(url, {
        signal: controller.signal,
        headers: requestHeaders(PRONTO_GOLD_BROWSER_USER_AGENT)
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

async function renderProntoGoldPageWithPlaywright(url = PRONTO_GOLD_QUOTE_URL, options = {}) {
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
    const acceptButton = page.getByText(/accetto|accetta|ok|chiudi/i);
    if (await acceptButton.count().catch(() => 0)) {
      await acceptButton.first().click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(1000);
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
  const found = new Set(quotes.map((quote) => quote.raw_payload?.pronto_gold_key).filter(Boolean));
  return PRONTO_GOLD_DEFINITIONS.filter((definition) => definition.required && !found.has(definition.key));
}

async function extractProntoGoldQuotesWithAi(pageTexts = [], options = {}) {
  if (!options.openai) return { quotes: [], warnings: ["AI fallback Pronto Gold non disponibile: OPENAI_API_KEY non configurata sul backend."] };
  const systemPrompt = "Sei un estrattore dati OroActive per il competitor Pronto Gold. Devi estrarre SOLO dal riquadro pubblico quotazioni oro/argento, distinguendo reference borsa, prezzi di acquisto cliente e prezzi di vendita. Non usare prezzi monete. Non inventare dati. Restituisci solo JSON valido.";
  const userPrompt = `Analizza il testo pubblico Pronto Gold e cerca solo questi dati:
1. Valore dell'ORO sulle Borse internazionali, quote_type reference_market_gold_price
2. ORO PURO 24k Acquisto, quote_type customer_buyback
3. ORO PURO 24k Vendita, quote_type sell_price
4. Compro ORO usato 18k da X a Y, quote_type customer_buyback, usare price=max e includere range_min/range_max
5. Compro ORO usato 14k Acquisto, quote_type customer_buyback
6. Compro ORO usato 9k Acquisto, quote_type customer_buyback
7. Valore dell'ARGENTO sulle Borse internazionali, quote_type reference_market_silver_price
8. ARGENTO PURO Acquisto, quote_type customer_buyback
9. ARGENTO PURO Vendita, quote_type sell_price
10. Compro ARGENTO usato 925 Acquisto, quote_type customer_buyback
11. Compro ARGENTO usato 800 Acquisto, quote_type customer_buyback
Ignora completamente la colonna monete. Se un prezzo non e chiaramente presente, non inventarlo.

TESTO:
${pageTexts.map((page) => `URL: ${page.url}\n${String(page.text || "").replace(/\s+/g, " ").trim()}`).join("\n\n---\n\n").slice(0, Number(options.maxTextChars || 12000))}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "pronto_gold_quote_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            found: { type: "boolean" },
            provider_timestamp_text: { type: "string" },
            quotes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  key: { type: "string" },
                  metal: { type: "string", enum: ["gold", "silver"] },
                  purity_code: { type: "string" },
                  purity_value: { type: "number" },
                  price: { type: "number" },
                  unit: { type: "string" },
                  quote_type: { type: "string", enum: ["customer_buyback", "reference_market_gold_price", "reference_market_silver_price", "sell_price"] },
                  price_kind: { type: "string" },
                  range_min: { type: ["number", "null"] },
                  range_max: { type: ["number", "null"] },
                  evidence_text: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  page_url: { type: "string" }
                },
                required: ["key", "metal", "purity_code", "purity_value", "price", "unit", "quote_type", "price_kind", "range_min", "range_max", "evidence_text", "confidence", "page_url"]
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            notes: { type: "string" }
          },
          required: ["found", "provider_timestamp_text", "quotes", "warnings", "notes"]
        }
      }
    }
  });
  const parsed = JSON.parse(response.output_text || "{}");
  const providerTimestamp = parseProntoGoldProviderTimestamp(parsed.provider_timestamp_text || "");
  const quotes = (parsed.quotes || []).map((quote) => {
    const definition = PRONTO_GOLD_DEFINITIONS.find((item) => (
      item.key === quote.key
      || (item.metal === quote.metal && item.purity_code === quote.purity_code && item.quote_type === quote.quote_type && item.price_kind === quote.price_kind)
    ));
    const price = Number(quote.price || 0);
    if (!definition || !price || !quote.evidence_text) return null;
    const unit = unitFromText(quote.unit || definition.defaultUnit || "EUR/g", definition.defaultUnit || "EUR/g");
    return prontoGoldQuote(definition, price, quote.page_url || options.sourceUrl || PRONTO_GOLD_QUOTE_URL, {
      source_method: "ai_fallback",
      matched_text: quote.evidence_text,
      ai_response: parsed,
      unit,
      provider_timestamp_text: providerTimestamp.text || parsed.provider_timestamp_text || "",
      provider_timestamp: providerTimestamp.iso || null,
      range_min_per_gram: quote.range_min || null,
      range_max_per_gram: quote.range_max || null,
      price_kind: quote.price_kind || definition.price_kind || null
    }, {
      ...options,
      unit,
      quoteDate: providerTimestamp.iso || options.quoteDate || new Date().toISOString(),
      extractionMethod: "ai_pronto_gold_fallback",
      confidence: quote.confidence || "medium",
      aiConfidence: quote.confidence || "medium",
      aiExtracted: true
    });
  }).filter(Boolean);
  return { quotes: dedupeProntoGoldQuotes(quotes), warnings: parsed.warnings || [] };
}

export function createProntoGoldExtractor(options = {}) {
  const config = {
    url: options.url || PRONTO_GOLD_DEFAULT_URL,
    quoteUrl: options.quoteUrl || PRONTO_GOLD_QUOTE_URL,
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    usePlaywright: options.usePlaywright !== false,
    useAiFallback: Boolean(options.useAiFallback),
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    maxTextChars: Number(options.maxTextChars || 12000)
  };

  async function extractProntoGoldQuotes(extractOptions = {}) {
    const runtime = { ...config, ...extractOptions };
    const warnings = [];
    const pages = [];
    try {
      const homepage = await fetchProntoGoldPage(runtime.url, runtime);
      pages.push(homepage);
      const quoteUrls = discoverProntoGoldQuoteUrls(homepage.html, homepage.url || runtime.url, runtime.quoteUrl);
      for (const quoteUrl of quoteUrls) {
        if (pages.some((page) => page.url === quoteUrl)) continue;
        const page = await fetchProntoGoldPage(quoteUrl, runtime).catch((error) => {
          warnings.push(`Pagina Pronto Gold non leggibile ${quoteUrl}: ${error.message || "errore fetch"}`);
          return null;
        });
        if (page) pages.push(page);
        if (pages.length >= 8) break;
      }
    } catch (error) {
      warnings.push(`Homepage Pronto Gold non leggibile: ${error.message || "errore fetch"}`);
      const quotePage = await fetchProntoGoldPage(runtime.quoteUrl, runtime).catch((quoteError) => {
        warnings.push(`Pagina quotazioni Pronto Gold non leggibile: ${quoteError.message || "errore fetch"}`);
        return null;
      });
      if (quotePage) pages.push(quotePage);
    }

    let quotes = dedupeProntoGoldQuotes(pages.flatMap((page) => extractProntoGoldQuotesFromText(`${page.text}\n${page.html || ""}`, {
      ...runtime,
      sourceUrl: page.url || runtime.quoteUrl
    })));

    if (requiredMissingDefinitions(quotes).length && runtime.usePlaywright) {
      const rendered = await renderProntoGoldPageWithPlaywright(runtime.quoteUrl, runtime).catch((error) => ({
        page: null,
        warning: error.message || "Rendering Playwright Pronto Gold non riuscito."
      }));
      if (rendered.warning) warnings.push(rendered.warning);
      if (rendered.page) {
        pages.push(rendered.page);
        quotes = dedupeProntoGoldQuotes(quotes.concat(extractProntoGoldQuotesFromText(rendered.page.text, {
          ...runtime,
          sourceUrl: rendered.page.url || runtime.quoteUrl
        })));
      }
    }

    if (requiredMissingDefinitions(quotes).length && runtime.useAiFallback) {
      const ai = await extractProntoGoldQuotesWithAi(pages, {
        ...runtime,
        sourceUrl: runtime.quoteUrl
      }).catch((error) => ({ quotes: [], warnings: [`AI fallback Pronto Gold non riuscito: ${error.message || "errore AI"}`] }));
      warnings.push(...(ai.warnings || []));
      if (ai.quotes?.length) quotes = dedupeProntoGoldQuotes(quotes.concat(ai.quotes));
    }

    for (const definition of requiredMissingDefinitions(quotes)) {
      warnings.push(`Prezzo ${definition.label} Pronto Gold non rilevato automaticamente.`);
    }

    const requiredCount = PRONTO_GOLD_DEFINITIONS.filter((definition) => definition.required).length;
    const foundCount = requiredCount - requiredMissingDefinitions(quotes).length;
    const status = foundCount === requiredCount ? "success" : foundCount ? "partial" : "failed";
    return {
      source: "pronto_gold",
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
