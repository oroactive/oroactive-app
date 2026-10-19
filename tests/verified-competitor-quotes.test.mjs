import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createOroExpressExtractor } from "../services/competitors/extractors/oroExpressExtractor.js";
import { createOroDOroExtractor, extractOroDOroQuotesFromText } from "../services/competitors/extractors/oroDOroExtractor.js";
import { createCompetitorExtractionTrainer } from "../services/competitors/competitorExtractionTrainer.js";

const resolver = async () => [{ address: "8.8.8.8", family: 4 }];
const response = (body, type = "text/html") => new Response(body, { headers: { "content-type": type } });
// Public ticker captured at https://comproorodoro.it/ on 2026-10-19.
// The source publishes no 20kt buyback price. Values are fixtures, never runtime defaults.
const ticker = "ORO 24KT · 110,71 €/g ORO 22KT · 91,35 €/g ORO 21KT · 86,83 €/g ORO 18KT · 74,36 €/g ORO 14KT · 43,00 €/g ORO 9KT · 27,80 €/g ARGENTO 999 · 1,07 €/g ARGENTO 925 · 0,85 €/g ARGENTO 900 · 0,76 €/g ARGENTO 800 · 0,66 €/g";
const poisonAi = { responses: { create: async () => { throw new Error("AI must not supply an unverified quote"); } } };

test("Oro Express uses the official AJAX headers and widget calculation for all four prices", async () => {
  const calls = [];
  const extractor = createOroExpressExtractor({ resolver, openai: poisonAi, fetchImpl: async (url, options) => {
    calls.push(String(url));
    const u = new URL(url);
    if (!u.searchParams.has("tipo")) return response("<p>Acquistiamo il tuo oro puro a partire da 0,0 €/gr.</p>");
    assert.equal(new Headers(options.headers).get("x-requested-with"), "XMLHttpRequest");
    assert.equal(new Headers(options.headers).get("referer"), "https://www.oro-express.it/");
    assert.equal(u.searchParams.get("id_negozio"), "null");
    const payloads = {
      orop: { valore_oro: 119.37027403570767, variazione: "6.49" },
      orou: { valore_oro: 119.37027403570767, variazione: "13.87" },
      argentop: { valore_argento: 1.72, variazione: "0.41" },
      argentou: { valore_argento: 1.72, variazione: "0.54" },
    };
    return response(JSON.stringify(payloads[u.searchParams.get("tipo")]), "text/html");
  } });
  const result = await extractor.extractOroExpressQuotes();
  assert.equal(result.status, "success");
  assert.deepEqual(result.quotes.map((q) => q.price_per_gram), [112.76, 75.66, 1.31, 0.84]);
  assert.equal(result.verified_only, true);
  assert.equal(calls.length, 5);
  for (const q of result.quotes) {
    assert.equal(q.ai_extracted, false);
    assert.equal(q.raw_payload.source_method, "public_widget_json");
    assert.equal(q.quote_type, "customer_buyback");
    assert.equal(q.currency, "EUR");
    assert.match(q.raw_payload.endpoint, /com_oroexpress/);
  }
});

test("Oro Express rejects missing, negative, non-finite or malformed widget inputs", async () => {
  for (const payload of [{ variazione: "-8" }, { valore_oro: -2, variazione: "-8" }, { valore_oro: 120 }, { valore_oro: "Infinity", variazione: "0" }, { valore_oro: 120, variazione: "invalid" }, { valore_oro: 120, variazione: ["euro", "90"] }]) {
    const result = await createOroExpressExtractor({ resolver, openai: poisonAi, fetchImpl: async (url) => new URL(url).searchParams.has("tipo") ? response(JSON.stringify(payload), "application/json") : response("<p>quotazioni 0,0</p>") }).extractOroExpressQuotes();
    assert.equal(result.quotes.length, 0, JSON.stringify(payload));
  }
});

test("Oro Express preserves the sign of the published variation", async () => {
  const result = await createOroExpressExtractor({ resolver, fetchImpl: async (url) => new URL(url).searchParams.has("tipo") ? response(JSON.stringify({ valore_oro: 100, variazione: "-1" }), "application/json") : response("") }).extractOroExpressQuotes();
  assert.equal(result.quotes.find((q) => q.purity_code === "24kt").price_per_gram, 100.9);
});

test("Oro D'Oro reads the canonical host and reports the missing 20kt without AI or estimates", async () => {
  const urls = [];
  const result = await createOroDOroExtractor({ url: "https://www.comproorodoro.it", resolver, useAiFallback: true, openai: poisonAi, fetchImpl: async (url) => { urls.push(String(url)); return response(`<p>${ticker}</p>`); } }).extractOroDOroQuotes();
  assert.deepEqual(urls, ["https://comproorodoro.it/"]);
  assert.equal(result.status, "partial");
  assert.equal(result.quotes.length, 9);
  assert.equal(result.verified_only, true);
  assert.deepEqual(result.missing_fields.map((f) => f.purity_code), ["20kt"]);
  assert.match(result.error, /20kt.*nessun prezzo verificabile/i);
  assert.equal(result.quotes.some((q) => q.purity_code === "20kt"), false);
  assert.ok(result.quotes.every((q) => !q.ai_extracted && q.source_url === "https://comproorodoro.it/"));
});

test("Oro D'Oro never assigns a neighboring carat price to an empty 20kt label", () => {
  for (const text of ["ORO 21kt 86,83 €/g ORO 20kt non disponibile ORO 18kt 74,36 €/g", "ORO 20kt - €/g 18kt 74,36 €/g", "ORO 20kt 0,00 €/g ORO 18kt 74,36 €/g", "ORO 20kt -12,00 €/g", "ORO 20kt 82,00 $/g", "ORO 20kt 82000 €/kg"]) {
    assert.equal(extractOroDOroQuotesFromText(text).some((q) => q.purity_code === "20kt"), false, text);
  }
});

test("Oro D'Oro accepts a future explicit 20kt quote and rejects conflicting duplicates", () => {
  const quotes = extractOroDOroQuotesFromText("ORO 21kt 86,83 €/g ORO 20kt 82,00 €/g ORO 18kt 74,36 €/g");
  assert.deepEqual(quotes.map((q) => [q.purity_code, q.price_per_gram]), [["21kt", 86.83], ["20kt", 82], ["18kt", 74.36]]);
  const conflicting = extractOroDOroQuotesFromText("ORO 20kt 82,00 €/g ORO 20kt 83,00 €/g");
  assert.equal(conflicting.length, 0);
});

test("guided extraction preserves verified-only missing fields even when AI is requested", async () => {
  let otherCalls = 0;
  const trainer = createCompetitorExtractionTrainer({ openai: poisonAi, resolver, fetchImpl: async () => { otherCalls++; throw new Error("must not refetch or infer a dedicated missing field"); }, oroDOroExtractor: createOroDOroExtractor({ resolver, fetchImpl: async () => response(`<p>${ticker}</p>`) }) });
  const source = { id: 3, name: "Oro D'Oro", website_url: "https://www.comproorodoro.it" };
  const rules = ["21kt", "20kt", "18kt"].map((code) => ({ field_key: `oro_doro_gold_${code}`, label: `ORO ${code}`, metal: "gold", purity_code: code, page_url: source.website_url, required: true, active: true }));
  for (const forceAi of [false, true]) {
    const result = await trainer.testCompetitorExtraction(source, rules, { forceAi });
    assert.equal(result.status, "partial");
    assert.deepEqual(result.quotes.map((q) => q.purity_code), ["21kt", "18kt"]);
    assert.equal(result.results[1].status, "not_found");
    assert.match(result.results[1].error, /20kt.*nessun prezzo verificabile/i);
  }
  assert.equal(otherCalls, 0);
});

test("Oro Express never treats an HTML error page as a quote", async () => {
  const result = await createOroExpressExtractor({ resolver, openai: poisonAi, fetchImpl: async () => response("<h1>403 Access Forbidden</h1>") }).extractOroExpressQuotes();
  assert.equal(result.status, "failed");
  assert.equal(result.quotes.length, 0);
});

test("Oro D'Oro summary shows unavailable 20kt explicitly and keeps an old value historical", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const start = app.indexOf("function oroDOroSummaryHtml()");
  const code = app.slice(start, app.indexOf("function amicoOroSummaryHtml()", start));
  const oldQuote = { metal: "gold", purity_code: "20kt", price_per_gram: 82, currency: "EUR", quote_date: "2026-10-18T10:00:00Z" };
  const ctx = vm.createContext({
    state: { competitorSources: [{ id: 3, name: "Oro D'Oro", last_sync_at: "2026-10-19T12:00:00Z" }], competitorExtractionRules: [{ source_id: 3, metal: "gold", purity_code: "20kt", last_test_status: "not_found", last_test_at: "2026-10-19T12:00:00Z" }] },
    latestOroDOroQuote: (metal, code) => code === "20kt" ? oldQuote : code === "18kt" ? { ...oldQuote, purity_code: "18kt", price_per_gram: 74 } : null,
    escapeHtml: String, formatGoldPerGram: (value) => `${value} EUR/g`, formatDateTime: String,
    competitorPurityDisplay: (q) => q.purity_code, competitorSourceStatusLabel: () => "Parziale", isFounder: () => true,
  });
  vm.runInContext(code, ctx);
  const html = ctx.oroDOroSummaryHtml();
  assert.match(html, /ORO 20kt<\/span><strong>Prezzo non disponibile dalla fonte<\/strong><small>Ultimo dato storico: 82 EUR\/g/);
  assert.equal(oldQuote.price_per_gram, 82);
});

test("Oro Express text fallback requires an explicit positive EUR/g price", async () => {
  for (const price of ["0,0 €/gr.", "-10,00 €/g", "112,00 $/g", "112000,00 €/kg"]) {
    const r = await createOroExpressExtractor({ resolver, fetchImpl: async (url) => new URL(url).searchParams.has("tipo") ? response("{}") : response(`<p>Acquistiamo il tuo oro puro a partire da ${price}</p>`) }).extractOroExpressQuotes();
    assert.equal(r.quotes.length, 0, price);
  }
  const r = await createOroExpressExtractor({ resolver, fetchImpl: async (url) => new URL(url).searchParams.has("tipo") ? response("{}") : response("<p>Acquistiamo il tuo oro puro a partire da 112,00 €/gr.</p>") }).extractOroExpressQuotes();
  assert.equal(r.quotes[0].price_per_gram, 112);
});

test("global AI refresh routes both dedicated sources through verified extraction and preserves provenance", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const start = server.indexOf("async function runAiCompetitorQuoteExtraction(");
  const code = server.slice(start, server.indexOf("function nextCompetitorAiRunAt(", start));
  const sources = [{ id: 1, name: "Oro Express" }, { id: 2, name: "Oro D'Oro" }];
  const saved = [], statuses = [];
  let aiCalls = 0;
  const ctx = vm.createContext({
    competitorAiExtractionEnabled: true, competitorAiExtractionState: {},
    competitorAiExtractionModel: "test", competitorAiMaxPagesPerSource: 8, competitorAiMaxTextChars: 12000, competitorAiUsePlaywright: false, openai: {}, goldPriceBaseCurrency: "EUR",
    pool: { query: async () => ({ rows: sources }) }, hiddenCompetitorSql: () => "true", publicCompetitorSource: (s) => s,
    createAiExtractionRun: async () => ({ id: 7 }), latestMetalPriceHistory: async () => null,
    aiCompetitorQuoteExtractor: { extractQuotesFromCompetitor: async () => { aiCalls++; return { quotes: [{ competitor_name: "Oro D'Oro", purity_code: "20kt", price_per_gram: 999 }], status: "success" }; } },
    extractCompetitorQuotes: async (source) => ({ quotes: [{ source_id: source.id, purity_code: "18kt", price_per_gram: 74, ai_extracted: false, extraction_method: "guided_specific_parser", raw_payload: { source_method: "public_source" } }], status: source.id === 2 ? "partial" : "success", error: source.id === 2 ? "ORO 20kt: nessun prezzo verificabile" : "" }),
    saveCompetitorQuotes: async (quotes) => { saved.push(...quotes); return { saved: quotes, errors: [] }; },
    saveAiExtractedCompetitorQuotes: async () => { throw new Error("verified prices must retain their method"); },
    insertAiExtractionPageLog: async () => {}, updateCompetitorSourceSyncStatus: async (...args) => { statuses.push(args); },
    nextCompetitorSyncDate: () => null, finishAiExtractionRun: async (_id, data) => data,
    calculateCompetitorMarketSummary: async () => ({}), writeAuditLog: async () => {}, publicAiExtractionRun: (r) => r, competitorAiExtractionPublicStatus: () => ({}), nextCompetitorAiRunAt: () => null,
  });
  vm.runInContext(code, ctx);
  const result = await ctx.runAiCompetitorQuoteExtraction({ force: true });
  assert.equal(result.ok, true);
  assert.equal(aiCalls, 0);
  assert.equal(saved.length, 2);
  assert.ok(saved.every((q) => q.ai_extracted === false && q.raw_payload.source_method === "public_source"));
  assert.match(statuses[1][3], /20kt.*nessun prezzo verificabile/);
});
