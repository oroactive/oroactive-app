import { extractReadableTextFromHtml } from "./aiCompetitorQuoteExtractor.js";

const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function parseTrainerItalianPrice(value = "") {
  const raw = String(value || "").replace(/\u00a0/g, " ").replace(/[^\d,.\s]/g, "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/\s+/g, "");
  if (compact.includes(",")) return Number(compact.replace(/\./g, "").replace(",", "."));
  const parts = compact.split(".");
  if (parts.length > 2) return Number(compact.replace(/\./g, ""));
  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) return Number(compact.replace(/\./g, ""));
  return Number(compact);
}

function normalizeUnit(value = "") {
  const text = String(value || "").toLowerCase();
  if (/kg|chilo|kilo|chilogram/.test(text)) return "EUR/kg";
  return "EUR/g";
}

function pricePerGram(value = 0, unit = "EUR/g") {
  const parsed = Number(value || 0);
  return normalizeUnit(unit) === "EUR/kg" ? parsed / 1000 : parsed;
}

function sanitizeEvidence(value = "") {
  return compactText(decodeHtml(value)).slice(0, 700);
}

function regexFromPattern(pattern = "") {
  if (!pattern) return null;
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

function stripTags(html = "") {
  return extractReadableTextFromHtml(html);
}

function tagInnerText(fragment = "") {
  return sanitizeEvidence(stripTags(fragment));
}

export function extractByCssSelector(html = "", selector = "") {
  const normalized = String(selector || "").trim();
  if (!normalized) return null;
  let regex = null;
  if (normalized.startsWith(".")) {
    const className = normalized.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regex = new RegExp(`<([a-z0-9]+)\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, "i");
  } else if (normalized.startsWith("#")) {
    const id = normalized.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regex = new RegExp(`<([a-z0-9]+)\\b[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, "i");
  } else if (/^[a-z][a-z0-9-]*$/i.test(normalized)) {
    regex = new RegExp(`<${normalized}\\b[^>]*>([\\s\\S]*?)<\\/${normalized}>`, "i");
  }
  const match = regex ? String(html || "").match(regex) : null;
  if (!match) return null;
  return tagInnerText(match[2] || match[1] || "");
}

export function extractByXPath(html = "", xpath = "") {
  const normalized = String(xpath || "").trim();
  if (!normalized) return null;
  const classMatch = normalized.match(/contains\(@class,\s*['"]([^'"]+)['"]\)/i);
  if (classMatch) return extractByCssSelector(html, `.${classMatch[1]}`);
  const idMatch = normalized.match(/@id\s*=\s*['"]([^'"]+)['"]/i);
  if (idMatch) return extractByCssSelector(html, `#${idMatch[1]}`);
  return null;
}

export function nearbyTextForAnchor(text = "", anchor = "", radius = 420) {
  const clean = compactText(text);
  const lower = clean.toLowerCase();
  const needle = String(anchor || "").toLowerCase().trim();
  if (!needle) return clean.slice(0, radius * 2);
  const index = lower.indexOf(needle);
  if (index < 0) return "";
  return clean.slice(Math.max(0, index - radius), index + needle.length + radius);
}

export function extractByAnchorRegex(text = "", anchor = "", regexPattern = "") {
  const nearby = nearbyTextForAnchor(text, anchor);
  const regex = regexFromPattern(regexPattern);
  if (!nearby || !regex) return null;
  const match = nearby.match(regex);
  if (!match) return null;
  const rawValue = match[1] || match[0];
  const value = parseTrainerItalianPrice(rawValue);
  if (!value) return null;
  return {
    value,
    unit: normalizeUnit(match[2] || ""),
    evidence_text: sanitizeEvidence(match[0])
  };
}

function extractionRange(rule = {}) {
  const metal = String(rule.metal || "").toLowerCase();
  const code = String(rule.purity_code || "").toLowerCase();
  if (metal === "silver") {
    if (code === "800") return [0.1, 4];
    return [0.2, 5];
  }
  if (code === "24kt") return [30, 200];
  if (code === "18kt") return [20, 160];
  return [1, 250];
}

export function validateExtractionResult(rule = {}, result = {}) {
  const price = Number(result.price_per_gram || result.value || 0);
  const [min, max] = extractionRange(rule);
  const reasons = [];
  if (!Number.isFinite(price) || price <= 0) reasons.push("prezzo non valido");
  if (!["gold", "silver"].includes(String(rule.metal || "").toLowerCase())) reasons.push("metallo non valido");
  if (!rule.purity_code) reasons.push("caratura/titolo mancante");
  if (!result.evidence_text) reasons.push("evidence_text mancante");
  if (price && (price < min || price > max)) reasons.push("prezzo fuori range atteso");
  return {
    ok: reasons.length === 0,
    status: reasons.length ? "da_verificare" : "found",
    reasons
  };
}

export async function extractQuoteWithAiFallback(context = {}, options = {}) {
  if (!options.openai) {
    return {
      found: false,
      price: null,
      unit: "EUR/g",
      evidence_text: null,
      confidence: "low",
      reason: "AI non disponibile sul backend"
    };
  }
  const prompt = `Estrai solo il prezzo relativo al campo indicato. Se non trovi un prezzo chiaramente collegato al campo, restituisci found=false. Non inventare dati.

Competitor: ${context.competitor_name || ""}
Pagina: ${context.page_url || ""}
Campo: ${context.field_key || ""} - ${context.label || ""}
Metallo: ${context.metal || ""}
Caratura/titolo: ${context.purity_code || ""}
Anchor: ${context.anchor_text || ""}

Testo vicino all'anchor:
${String(context.nearby_text || "").slice(0, 3000)}`;
  const response = await options.openai.responses.create({
    model: options.model || "gpt-4.1-mini",
    input: `Sei un estrattore dati per OroActive. Devi restituire solo JSON valido. ${prompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "guided_competitor_quote_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            found: { type: "boolean" },
            price: { type: ["number", "null"] },
            unit: { type: "string" },
            evidence_text: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            reason: { type: "string" }
          },
          required: ["found", "price", "unit", "evidence_text", "confidence", "reason"]
        }
      }
    }
  });
  return JSON.parse(response.output_text || "{}");
}

function priceFromText(value = "") {
  const match = String(value || "").match(/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(?:€|eur|euro)?\s*(?:\/?\s*(kg|g|gr|grammo|grammi))?/i);
  if (!match) return null;
  return {
    value: parseTrainerItalianPrice(match[1]),
    unit: normalizeUnit(match[2] || "g"),
    evidence_text: sanitizeEvidence(value)
  };
}

function quoteFromResult(rule = {}, result = {}, source = {}) {
  const price = pricePerGram(result.value || result.price || result.price_per_gram, result.unit || rule.unit || "EUR/g");
  return {
    source_id: rule.source_id || source.id || null,
    competitor_name: rule.competitor_name || source.name || "",
    metal: rule.metal,
    purity_code: rule.purity_code,
    purity_value: rule.purity_value,
    price_per_gram: price,
    price_per_kg: price * 1000,
    currency: "EUR",
    quote_date: new Date().toISOString(),
    extraction_method: result.method || rule.extraction_method || "anchor_regex",
    confidence: result.confidence || "medium",
    ai_confidence: result.ai_extracted ? result.confidence || "medium" : result.confidence || "high",
    ai_extracted: Boolean(result.ai_extracted),
    quote_type: "customer_buyback",
    evidence_text: result.evidence_text || "",
    url: rule.page_url || source.website_url || "",
    source_url: rule.page_url || source.website_url || "",
    raw_payload: {
      field_key: rule.field_key,
      rule_id: rule.id || null,
      method: result.method || rule.extraction_method || "anchor_regex"
    }
  };
}

function sourceSpecificQuoteForRule(rule = {}, sourceQuotes = []) {
  const byFieldKey = sourceQuotes.find((quote) => (
    rule.field_key
    && [
      quote.raw_payload?.oro_express_key,
      quote.raw_payload?.oro_doro_key,
      quote.raw_payload?.amico_oro_key,
      quote.raw_payload?.banco_preziosi_key,
      quote.raw_payload?.bordin_key,
      quote.raw_payload?.gold_standard_key,
      quote.raw_payload?.oro_in_euro_key
    ].filter(Boolean).some((key) => String(key) === String(rule.field_key))
  ));
  if (byFieldKey) return byFieldKey;
  return sourceQuotes.find((quote) => (
    String(quote.metal) === String(rule.metal)
    && String(quote.purity_code) === String(rule.purity_code)
  )) || null;
}

export function createCompetitorExtractionTrainer(options = {}) {
  const config = {
    fetchPage: options.fetchPage,
    openai: options.openai || null,
    model: options.model || "gpt-4.1-mini",
    oroExpressExtractor: options.oroExpressExtractor || null,
    oroDOroExtractor: options.oroDOroExtractor || null,
    amicoOroExtractor: options.amicoOroExtractor || null,
    bancoPreziosiExtractor: options.bancoPreziosiExtractor || null,
    bordinExtractor: options.bordinExtractor || null,
    goldStandardExtractor: options.goldStandardExtractor || null,
    oroInEuroExtractor: options.oroInEuroExtractor || null
  };

  async function fetchPublicPage(url = "") {
    if (config.fetchPage) return config.fetchPage(url);
    const response = await fetch(url, { headers: { "User-Agent": "OroActiveBot/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { body: await response.text(), contentType: response.headers.get("content-type") || "" };
  }

  async function sourceSpecificQuotes(source = {}, rules = []) {
    const sourceName = String(source.name || "").toLowerCase();
    if (config.oroExpressExtractor && sourceName === "oro express") {
      const result = await config.oroExpressExtractor.extractOroExpressQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    if (config.oroDOroExtractor && sourceName === "oro d'oro") {
      const result = await config.oroDOroExtractor.extractOroDOroQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    if (config.amicoOroExtractor && sourceName === "amico oro") {
      const result = await config.amicoOroExtractor.extractAmicoOroQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    if (config.bancoPreziosiExtractor && sourceName === "banco preziosi") {
      const result = await config.bancoPreziosiExtractor.extractBancoPreziosiQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: source.website_url,
        quoteUrl: rules.find((rule) => /quotazioni/i.test(rule.page_url || ""))?.page_url || rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    if (config.bordinExtractor && sourceName === "bordin") {
      const result = await config.bordinExtractor.extractBordinQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    if (config.goldStandardExtractor && sourceName === "gold standard") {
      const result = await config.goldStandardExtractor.extractGoldStandardQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    if (config.oroInEuroExtractor && sourceName === "oro in euro") {
      const result = await config.oroInEuroExtractor.extractOroInEuroQuotes({
        source_id: source.id,
        sourceId: source.id,
        url: rules[0]?.page_url || source.website_url
      }).catch(() => ({ quotes: [] }));
      return result.quotes || [];
    }
    return [];
  }

  function sourceSpecificMethod(source = {}) {
    const sourceName = String(source.name || "").toLowerCase();
    if (sourceName === "banco preziosi") return "guided_banco_preziosi_parser";
    if (sourceName === "bordin") return "guided_bordin_parser";
    if (sourceName === "gold standard") return "guided_gold_standard_parser";
    if (sourceName === "oro in euro") return "guided_oro_in_euro_parser";
    if (sourceName === "amico oro") return "guided_amico_oro_parser";
    if (sourceName === "oro d'oro") return "guided_oro_doro_parser";
    if (sourceName === "oro express") return "guided_oro_express_parser";
    return "guided_specific_parser";
  }

  async function extractRule(rule = {}, source = {}, pageCache = new Map(), sourceQuotes = [], options = {}) {
    const specific = options.forceAi ? null : sourceSpecificQuoteForRule(rule, sourceQuotes);
    if (specific) {
      const method = sourceSpecificMethod(source);
      return {
        rule,
        status: "found",
        value: Number(specific.price_per_gram || 0),
        unit: "EUR/g",
        evidence_text: specific.evidence_text || "",
        method,
        confidence: specific.ai_confidence || specific.confidence || "high",
        quote: { ...specific, extraction_method: method }
      };
    }
    const pageUrl = rule.page_url || source.website_url || "";
    if (!pageUrl) {
      return { rule, status: "error", value: null, unit: rule.unit || "EUR/g", evidence_text: "", method: rule.extraction_method || "anchor_regex", confidence: "low", error: "URL pagina mancante" };
    }
    if (!pageCache.has(pageUrl)) {
      pageCache.set(pageUrl, await fetchPublicPage(pageUrl));
    }
    const page = pageCache.get(pageUrl);
    const html = page.body || page.html || "";
    const text = extractReadableTextFromHtml(html);
    let result = null;
    let method = "";
    if (!options.forceAi && rule.css_selector) {
      const extracted = extractByCssSelector(html, rule.css_selector);
      const price = priceFromText(extracted || "");
      if (price?.value) {
        result = price;
        method = "css_selector";
      }
    }
    if (!options.forceAi && !result && rule.xpath_selector) {
      const extracted = extractByXPath(html, rule.xpath_selector);
      const price = priceFromText(extracted || "");
      if (price?.value) {
        result = price;
        method = "xpath_selector";
      }
    }
    if (!options.forceAi && !result && rule.anchor_text && rule.regex_pattern) {
      result = extractByAnchorRegex(text, rule.anchor_text, rule.regex_pattern);
      if (result) method = "anchor_regex";
    }
    if (!result) {
      const nearby = nearbyTextForAnchor(text, rule.anchor_text || rule.label || "");
      const ai = await extractQuoteWithAiFallback({
        competitor_name: rule.competitor_name || source.name,
        page_url: pageUrl,
        field_key: rule.field_key,
        label: rule.label,
        metal: rule.metal,
        purity_code: rule.purity_code,
        anchor_text: rule.anchor_text,
        nearby_text: nearby
      }, config).catch((error) => ({
        found: false,
        price: null,
        unit: rule.unit || "EUR/g",
        evidence_text: null,
        confidence: "low",
        reason: error.message || "AI fallback non riuscito"
      }));
      if (ai.found && ai.price && ai.evidence_text) {
        result = { value: ai.price, unit: ai.unit || rule.unit || "EUR/g", evidence_text: sanitizeEvidence(ai.evidence_text), ai_extracted: true, confidence: VALID_CONFIDENCE.has(ai.confidence) ? ai.confidence : "medium" };
        method = "ai_guided_fallback";
      } else {
        return { rule, status: "not_found", value: null, unit: rule.unit || "EUR/g", evidence_text: "", method: "ai_guided_fallback", confidence: "low", error: ai.reason || "Dato non rilevato" };
      }
    }
    const validation = validateExtractionResult(rule, {
      value: pricePerGram(result.value, result.unit || rule.unit),
      evidence_text: result.evidence_text
    });
    const status = validation.ok ? "found" : "da_verificare";
    const quote = quoteFromResult(rule, {
      value: result.value,
      unit: result.unit || rule.unit || "EUR/g",
      evidence_text: result.evidence_text,
      method,
      confidence: result.confidence || (status === "found" ? "high" : "low"),
      ai_extracted: Boolean(result.ai_extracted)
    }, source);
    return {
      rule,
      status,
      value: quote.price_per_gram,
      unit: "EUR/g",
      evidence_text: result.evidence_text,
      method,
      confidence: quote.ai_confidence || quote.confidence,
      error: validation.reasons.join(", "),
      quote: validation.ok ? quote : null
    };
  }

  async function testCompetitorExtraction(source = {}, rules = [], options = {}) {
    const activeRules = rules.filter((rule) => rule.active !== false);
    if (!activeRules.length) {
      return { status: "not_configured", results: [], quotes: [], error: "Nessuna regola di estrazione configurata per questo competitor." };
    }
    const pageCache = new Map();
    const sourceQuotes = options.forceAi ? [] : await sourceSpecificQuotes(source, activeRules);
    const results = [];
    for (const rule of activeRules) {
      results.push(await extractRule(rule, source, pageCache, sourceQuotes, options).catch((error) => ({
        rule,
        status: "error",
        value: null,
        unit: rule.unit || "EUR/g",
        evidence_text: "",
        method: rule.extraction_method || "anchor_regex",
        confidence: "low",
        error: error.message || "Errore estrazione"
      })));
    }
    const quotes = results.map((result) => result.quote).filter(Boolean);
    return {
      status: results.every((result) => result.status === "found") ? "success" : quotes.length ? "partial" : "failed",
      results,
      quotes,
      error: results.map((result) => result.error).filter(Boolean).join(" | ").slice(0, 1200)
    };
  }

  return {
    getExtractionRules: null,
    testExtractionRule: extractRule,
    testCompetitorExtraction,
    extractByCssSelector,
    extractByXPath,
    extractByAnchorRegex,
    extractQuoteWithAiFallback,
    saveExtractionTestResult: null,
    saveCompetitorQuoteFromRule: null
  };
}
