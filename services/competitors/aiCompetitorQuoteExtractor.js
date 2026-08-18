import { safeExternalFetch } from "../security/safeExternalFetch.js";

const QUOTE_KEYWORDS = [
  "quotazione",
  "quotazioni",
  "valuta oro",
  "compro oro",
  "compro argento",
  "oro usato",
  "argento usato",
  "prezzo oro",
  "prezzo argento",
  "blocca il prezzo",
  "valutazione oro",
  "ritiro oro",
  "calcolatore"
];

const PRIVATE_URL_PATTERN = /(login|signin|account|area-riservata|admin|checkout|cart|captcha|privacy|cookie|terms|condizioni)/i;
const ALLOWED_QUOTE_TYPES = new Set(["customer_buyback", "spot_price", "theoretical_price", "unknown"]);
const ALLOWED_CONFIDENCE = new Set(["low", "medium", "high"]);
const COMPETITOR_HTML_MAX_BYTES = 2 * 1024 * 1024;

function allowedHostsForCompetitorUrl(value = "") {
  const hostname = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) throw new Error("Dominio competitor non valido.");
  const companion = hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`;
  return [...new Set([hostname, companion])];
}

function clampText(value = "", maxChars = 12000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function decodeHtmlEntities(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function extractReadableTextFromHtml(html = "") {
  return decodeHtmlEntities(String(html || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameOriginUrl(rawUrl = "", baseUrl = "") {
  try {
    const base = new URL(baseUrl);
    const url = new URL(rawUrl, base);
    url.hash = "";
    if (url.origin !== base.origin) return null;
    if (url.protocol !== "https:") return null;
    if (PRIVATE_URL_PATTERN.test(url.pathname + url.search)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractInternalLinks(html = "", baseUrl = "") {
  const links = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || "").matchAll(anchorRegex)) {
    const url = sameOriginUrl(match[1], baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const text = extractReadableTextFromHtml(match[2] || "");
    links.push({ url, text });
  }
  return links;
}

function quoteLinkScore(link = {}) {
  const haystack = `${link.url || ""} ${link.text || ""}`.toLowerCase();
  return QUOTE_KEYWORDS.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
}

export async function fetchCompetitorPage(url = "", options = {}) {
  const allowedHosts = Array.isArray(options.allowedHosts) && options.allowedHosts.length
    ? options.allowedHosts
    : allowedHostsForCompetitorUrl(url);
  const response = await safeExternalFetch(url, {
    allowedHosts,
    timeoutMs: Math.min(Number(options.timeoutMs || 15000), 15000),
    maxBytes: Math.min(Number(options.maxBytes || COMPETITOR_HTML_MAX_BYTES), COMPETITOR_HTML_MAX_BYTES),
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
  return {
    url: response.url || url,
    html: await response.text(),
    contentType: response.headers.get("content-type") || "",
    method: "safe_external_fetch"
  };
}

function htmlSnippet(html = "", maxChars = 5000) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

export async function discoverRelevantQuotePages(source = {}, options = {}) {
  const homepage = source.website_url || source.websiteUrl || "";
  if (!homepage) return { pages: [], warnings: ["Sito competitor non configurato."], homepage: null };
  let allowedHosts;
  try {
    allowedHosts = allowedHostsForCompetitorUrl(homepage);
  } catch (error) {
    return { pages: [], warnings: [`Sito competitor non valido: ${error.message}`], homepage: null };
  }
  const warnings = [];
  let homePage;
  try {
    homePage = await fetchCompetitorPage(homepage, { ...options, allowedHosts });
  } catch (error) {
    return {
      pages: [{ url: homepage, reason: "homepage_non_leggibile", score: 0 }],
      warnings: [`Homepage non leggibile: ${error.message || "errore fetch"}`],
      homepage: null
    };
  }
  const homeText = extractReadableTextFromHtml(homePage.html);
  const links = extractInternalLinks(homePage.html, homePage.url || homepage)
    .map((link) => ({ ...link, score: quoteLinkScore(link) }))
    .filter((link) => link.score > 0)
    .sort((a, b) => b.score - a.score);
  const maxPages = Math.min(Math.max(Number(options.maxPagesPerSource || 8), 1), 8);
  const pages = [{ url: homePage.url || homepage, reason: "homepage", score: quoteLinkScore({ url: homepage, text: homeText }) }]
    .concat(links.map((link) => ({ url: link.url, reason: "keyword_link", score: link.score })))
    .filter((page, index, array) => array.findIndex((item) => item.url === page.url) === index)
    .slice(0, maxPages);
  if (pages.length === 1 && pages[0].score === 0) {
    warnings.push("Nessun link quotazione evidente trovato: analizzo solo la homepage.");
  }
  return { pages, warnings, homepage: homePage };
}

const aiCompetitorQuoteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    found: { type: "boolean" },
    competitor_name: { type: "string" },
    page_url: { type: "string" },
    quotes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          metal: { type: "string" },
          purity_code: { type: "string" },
          purity_value: { type: "number" },
          price: { type: "number" },
          unit: { type: "string" },
          currency: { type: "string" },
          quote_type: { type: "string", enum: ["customer_buyback", "spot_price", "theoretical_price", "unknown"] },
          evidence_text: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["metal", "purity_code", "purity_value", "price", "unit", "currency", "quote_type", "evidence_text", "confidence"]
      }
    },
    warnings: { type: "array", items: { type: "string" } },
    notes: { type: "string" }
  },
  required: ["found", "competitor_name", "page_url", "quotes", "warnings", "notes"]
};

export async function extractQuotesWithAi(input = {}, options = {}) {
  if (!options.openai) {
    return {
      found: false,
      competitor_name: input.competitor_name || "",
      page_url: input.page_url || "",
      quotes: [],
      warnings: ["AI non disponibile: OPENAI_API_KEY non configurata sul backend."],
      notes: "Nessuna quotazione estratta senza AI."
    };
  }
  const systemPrompt = "Sei un estrattore dati per OroActive. Devi leggere il testo pubblico di una pagina web di un competitor compro oro e individuare SOLO quotazioni di acquisto/ritiro/compro oro o compro argento pagate al cliente. Non devi estrarre prezzi spot di borsa se non sono prezzi pagati al cliente. Non devi inventare dati. Se non trovi un prezzo chiaro, restituisci found=false. Devi distinguere metallo, caratura/titolo, prezzo, unita, valuta e prova testuale. Devi restituire solo JSON valido secondo lo schema richiesto.";
  const userPrompt = `Analizza questa pagina pubblica del competitor e estrai le quotazioni di acquisto oro/argento pagate al cliente.
Se trovi quotazioni per oro 24kt, 22kt, 21kt, 18kt, 14kt, 12kt, 9kt, 6kt o argento 999, 925, 800, restituiscile.
Se trovi solo prezzo oro puro o argento puro, indicarlo chiaramente come spot_price o theoretical_price e non come prezzo pagato al cliente.
Non inventare dati mancanti.

Competitor: ${input.competitor_name || ""}
Sito: ${input.website_url || ""}
Pagina: ${input.page_url || ""}
Data estrazione: ${input.extraction_date || new Date().toISOString()}

TESTO PAGINA:
${clampText(input.page_text || "", options.maxTextChars || 12000)}

HTML ESTRATTO:
${clampText(input.html_excerpt || "", 5000)}`;

  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `${systemPrompt}\n\n${userPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "competitor_quote_extraction",
        strict: true,
        schema: aiCompetitorQuoteSchema
      }
    }
  });
  return JSON.parse(response.output_text || "{}");
}

function normalizeMetal(value = "") {
  const text = String(value || "").toLowerCase();
  if (text.includes("argento") || text.includes("silver")) return "silver";
  return "gold";
}

function normalizePurityCode(value = "", metal = "gold") {
  const raw = String(value || "").toLowerCase();
  const compact = raw.replace(/\s+/g, "");
  if (metal === "silver") {
    if (/sterling/.test(raw)) return "925";
    if (/puro/.test(raw)) return "999";
    const silver = compact.match(/(999|925|800)/);
    return silver ? silver[1] : "925";
  }
  if (/puro|24carati/.test(compact)) return "24kt";
  const gold = raw.match(/\b(24|22|21|18|14|12|9|6)\s*(?:kt|k|carati|carato)?\b/);
  return gold ? `${gold[1]}kt` : "18kt";
}

function purityValue(metal = "gold", purityCode = "") {
  if (metal === "silver") {
    const title = Number(String(purityCode).replace(/\D/g, ""));
    return Number.isFinite(title) && title > 0 ? Math.min(1, title / 1000) : 0.925;
  }
  const kt = Number(String(purityCode).replace(/\D/g, ""));
  return Number.isFinite(kt) && kt > 0 ? Math.min(1, kt / 24) : 0.75;
}

function parseItalianPriceToNumber(value = "") {
  const raw = String(value || "").replace(/\u00a0/g, " ").replace(/[^\d,.\s]/g, "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/\s+/g, "");
  if (compact.includes(",")) return Number(compact.replace(/\./g, "").replace(",", "."));
  const parts = compact.split(".");
  if (parts.length > 2) return Number(compact.replace(/\./g, ""));
  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) return Number(compact.replace(/\./g, ""));
  return Number(compact);
}

function normalizeConfidence(value = "") {
  const text = String(value || "").toLowerCase();
  if (["alta", "alto", "high"].includes(text)) return "high";
  if (["bassa", "basso", "low"].includes(text)) return "low";
  return "medium";
}

function normalizeQuoteType(value = "") {
  const text = String(value || "").toLowerCase();
  return ALLOWED_QUOTE_TYPES.has(text) ? text : "unknown";
}

function unitIsKg(value = "") {
  return /kg|chilo|kilo|chilogram/i.test(String(value || ""));
}

export function normalizeAiQuote(aiQuote = {}, context = {}) {
  const metal = normalizeMetal(aiQuote.metal || context.metal || "");
  const purityCode = normalizePurityCode(aiQuote.purity_code || aiQuote.purityCode || "", metal);
  const rawPrice = aiQuote.price_per_gram || aiQuote.pricePerGram || aiQuote.price || aiQuote.value || 0;
  const parsedPrice = Number(rawPrice) || parseItalianPriceToNumber(rawPrice);
  const pricePerGram = unitIsKg(aiQuote.unit || aiQuote.price_unit || aiQuote.priceUnit)
    ? parsedPrice / 1000
    : parsedPrice;
  const sourceUrl = aiQuote.source_url || aiQuote.sourceUrl || context.page_url || context.url || "";
  const confidence = normalizeConfidence(aiQuote.confidence);
  return {
    source_id: context.source_id || context.sourceId || null,
    competitor_name: context.competitor_name || context.competitorName || "",
    metal,
    purity_code: purityCode,
    purity_value: Number(aiQuote.purity_value ?? aiQuote.purityValue ?? purityValue(metal, purityCode)),
    price_per_gram: pricePerGram,
    price_per_kg: pricePerGram * 1000,
    currency: String(aiQuote.currency || "EUR").toUpperCase(),
    quote_date: context.extraction_date || new Date().toISOString(),
    extraction_method: "ai_extraction",
    confidence,
    ai_confidence: confidence,
    quote_type: normalizeQuoteType(aiQuote.quote_type || aiQuote.quoteType),
    evidence_text: String(aiQuote.evidence_text || aiQuote.evidenceText || "").trim().slice(0, 700),
    url: sourceUrl,
    source_url: sourceUrl,
    ai_extracted: true,
    raw_payload: {
      ai_quote: aiQuote,
      extraction_page_url: sourceUrl,
      notes: context.notes || "",
      warnings: context.warnings || []
    }
  };
}

function isReasonablePrice(quote = {}) {
  const price = Number(quote.price_per_gram || 0);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (quote.metal === "silver") return price >= 0.01 && price <= 20;
  return price >= 1 && price <= 250;
}

export function validateExtractedQuotes(quotes = []) {
  const valid = [];
  const rejected = [];
  for (const quote of quotes) {
    const reasons = [];
    if (!["gold", "silver"].includes(quote.metal)) reasons.push("metallo non valido");
    if (!quote.purity_code) reasons.push("caratura/titolo mancante");
    if (quote.currency !== "EUR") reasons.push("valuta non EUR");
    if (!quote.source_url && !quote.url) reasons.push("source_url mancante");
    if (!quote.evidence_text) reasons.push("evidence_text mancante");
    if (!ALLOWED_CONFIDENCE.has(quote.ai_confidence || quote.confidence)) reasons.push("confidence non valida");
    if (!ALLOWED_QUOTE_TYPES.has(quote.quote_type)) reasons.push("quote_type non valido");
    if (!isReasonablePrice(quote)) reasons.push("prezzo fuori range prudente");
    if (reasons.length) {
      rejected.push({ quote, reasons });
    } else {
      valid.push(quote);
    }
  }
  return { valid, rejected };
}

export function createAiCompetitorQuoteExtractor(options = {}) {
  const config = {
    maxPagesPerSource: Math.min(Math.max(Number(options.maxPagesPerSource || 8), 1), 8),
    timeoutMs: Number(options.timeoutMs || 15000),
    userAgent: options.userAgent || "OroActiveBot/1.0",
    maxBytes: Math.min(Number(options.maxBytes || COMPETITOR_HTML_MAX_BYTES), COMPETITOR_HTML_MAX_BYTES),
    maxTextChars: Number(options.maxTextChars || 12000),
    model: options.model || "gpt-4.1-mini",
    openai: options.openai || null,
    logger: options.logger || console,
    fetchImpl: options.fetchImpl,
    resolver: options.resolver,
    signal: options.signal
  };

  async function fetchPageWithFallback(url = "", source = {}) {
    const homepage = source.website_url || source.websiteUrl || url;
    const fetched = await fetchCompetitorPage(url, {
      ...config,
      allowedHosts: allowedHostsForCompetitorUrl(homepage)
    });
    const text = extractReadableTextFromHtml(fetched.html);
    const hasQuoteSignal = QUOTE_KEYWORDS.some((keyword) => text.toLowerCase().includes(keyword));
    if (text.length >= 800 && hasQuoteSignal) return fetched;
    return { ...fetched, render_warning: "Contenuto dinamico non eseguito: rendering browser disabilitato per sicurezza." };
  }

  async function extractQuotesFromPage(source = {}, page = {}) {
    const pageResult = {
      page_url: page.url,
      status: "running",
      quotes_found: 0,
      error_message: "",
      ai_response: {}
    };
    try {
      const fetched = await fetchPageWithFallback(page.url, source);
      const pageText = clampText(extractReadableTextFromHtml(fetched.html), config.maxTextChars);
      if (!pageText) throw new Error("Pagina senza testo leggibile.");
      const ai = await extractQuotesWithAi({
        competitor_name: source.name,
        website_url: source.website_url,
        page_url: fetched.url || page.url,
        page_text: pageText,
        html_excerpt: htmlSnippet(fetched.html),
        extraction_date: new Date().toISOString()
      }, config);
      const normalized = (Array.isArray(ai.quotes) ? ai.quotes : [])
        .map((quote) => normalizeAiQuote(quote, {
          source_id: source.id,
          competitor_name: source.name,
          page_url: fetched.url || page.url,
          extraction_date: new Date().toISOString(),
          notes: ai.notes || "",
          warnings: ai.warnings || []
        }));
      const validated = validateExtractedQuotes(normalized);
      pageResult.status = validated.valid.length ? "success" : ai.found ? "partial" : "no_quotes";
      pageResult.quotes_found = validated.valid.length;
      pageResult.error_message = [
        fetched.render_warning || "",
        ...(Array.isArray(ai.warnings) ? ai.warnings : []),
        ...validated.rejected.map((item) => item.reasons.join(", "))
      ].filter(Boolean).join(" | ").slice(0, 1200);
      pageResult.ai_response = {
        found: Boolean(ai.found),
        warnings: ai.warnings || [],
        notes: ai.notes || "",
        quotes: validated.valid.map((quote) => ({
          metal: quote.metal,
          purity_code: quote.purity_code,
          price_per_gram: quote.price_per_gram,
          quote_type: quote.quote_type,
          evidence_text: quote.evidence_text,
          confidence: quote.ai_confidence
        })),
        rejected_count: validated.rejected.length
      };
      return { page: pageResult, quotes: validated.valid, rejected: validated.rejected };
    } catch (error) {
      pageResult.status = "failed";
      pageResult.error_message = error.message || "Fonte non leggibile automaticamente.";
      return { page: pageResult, quotes: [], rejected: [] };
    }
  }

  async function extractQuotesFromCompetitor(source = {}) {
    const discovery = await discoverRelevantQuotePages(source, config);
    const pages = [];
    const quotes = [];
    const rejected = [];
    for (const page of discovery.pages.slice(0, config.maxPagesPerSource)) {
      const result = await extractQuotesFromPage(source, page);
      pages.push(result.page);
      quotes.push(...result.quotes);
      rejected.push(...result.rejected);
    }
    const status = quotes.length
      ? pages.some((page) => page.status === "failed" || page.status === "partial") ? "partial" : "success"
      : pages.some((page) => page.status === "failed") ? "failed" : "no_quotes";
    return {
      status,
      pages,
      quotes,
      rejected,
      warnings: discovery.warnings || [],
      pages_analyzed: pages.length,
      quotes_found: quotes.length
    };
  }

  return {
    runAiCompetitorQuoteExtraction: null,
    extractQuotesFromCompetitor,
    discoverRelevantQuotePages: (source) => discoverRelevantQuotePages(source, config),
    fetchCompetitorPage: (url) => fetchCompetitorPage(url, config),
    extractReadableTextFromHtml,
    extractQuotesWithAi: (input) => extractQuotesWithAi(input, config),
    validateExtractedQuotes,
    normalizeExtractedQuote: normalizeAiQuote,
    normalizeAiQuote,
    saveAiExtractedCompetitorQuotes: null,
    updateCompetitorSyncStatus: null
  };
}
