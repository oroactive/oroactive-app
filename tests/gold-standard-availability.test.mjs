import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createGoldStandardExtractor } from "../services/competitors/extractors/goldStandardExtractor.js";
import { createCompetitorExtractionTrainer } from "../services/competitors/competitorExtractionTrainer.js";

const resolver = async () => [{ address: "8.8.8.8", family: 4 }];
// Official public prices inspected on 2026-10-23; fixtures are never runtime defaults.
const page = "Quotazione dell’oro in borsa € 115,21 /g Acquistiamo ORO 18K al prezzo MIN € 73,53 /g Acquistiamo ORO 24K al prezzo MIN € 107,97 /g Quotazione dell’argento in borsa € 1.558,37 Acquistiamo ARGENTO 925 al chilo € 944,90 Acquistiamo ARGENTO 800 al chilo € 817,21";
const makeExtractor = (text) => createGoldStandardExtractor({ resolver, fetchImpl: async () => new Response(`<main>${text}</main>`, { headers: { "content-type": "text/html" } }) });
const source = { id: 7, name: "Gold Standard", website_url: "https://www.goldstandard.gold/" };
const fields = [
  ["gold_standard_gold_24kt_reference", "gold", "24kt", "reference_market_gold_price"],
  ["gold_standard_gold_18kt_buyback", "gold", "18kt", "customer_buyback"],
  ["gold_standard_gold_24kt_buyback", "gold", "24kt", "customer_buyback"],
  ["gold_standard_silver_reference", "silver", "999", "reference_market_silver_price"],
  ["gold_standard_silver_925_buyback", "silver", "925", "customer_buyback"],
  ["gold_standard_silver_800_buyback", "silver", "800", "customer_buyback"]
];
const rules = fields.map(([field_key, metal, purity_code, quote_type]) => ({ field_key, metal, purity_code, quote_type, active: true, required: true, page_url: source.website_url }));

test("Gold Standard is updated for verified customer prices while unitless market silver is excluded", async () => {
  const result = await makeExtractor(page).extractGoldStandardQuotes();
  assert.equal(result.status, "success");
  assert.equal(result.error, "");
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.missing_fields, []);
  assert.deepEqual(result.excluded_fields.map((field) => field.field_key), ["gold_standard_silver_reference"]);
  assert.match(result.excluded_fields[0].reason, /unità.*verificabil.*Storico conservato/i);
  assert.equal(result.quotes.some((quote) => quote.quote_type === "reference_market_silver_price"), false);
  assert.deepEqual(result.quotes.filter((quote) => quote.quote_type === "customer_buyback").map((quote) => quote.price_per_gram), [73.53, 107.97, 0.9449, 0.81721]);
  assert.ok(result.quotes.every((quote) => !quote.ai_extracted && quote.raw_payload.verified_official));
});

test("Gold Standard resumes market silver extraction only with an explicit official unit", async () => {
  for (const suffix of [" /kg", " €/kg"]) {
    const text = page.replace("€ 1.558,37", suffix === " /kg" ? "€ 1.558,37 /kg" : "1.558,37 €/kg");
    const result = await makeExtractor(text).extractGoldStandardQuotes();
    assert.equal(result.status, "success");
    assert.deepEqual(result.excluded_fields, []);
    const silver = result.quotes.find((quote) => quote.quote_type === "reference_market_silver_price");
    assert.equal(silver.price_per_kg, 1558.37);
    assert.ok(Math.abs(silver.price_per_gram - 1.55837) < 1e-12);
  }
  const withdrawn = await makeExtractor(page).extractGoldStandardQuotes();
  assert.equal(withdrawn.status, "success");
  assert.equal(withdrawn.excluded_fields[0].field_key, "gold_standard_silver_reference");
});

test("Gold Standard never marks missing, invalid or ambiguous customer buyback prices as excluded", async () => {
  const customerPrices = [
    ["gold_standard_gold_18kt_buyback", "€ 73,53 /g", "Acquistiamo ORO 18K al prezzo MIN"],
    ["gold_standard_gold_24kt_buyback", "€ 107,97 /g", "Acquistiamo ORO 24K al prezzo MIN"],
    ["gold_standard_silver_925_buyback", "€ 944,90", "Acquistiamo ARGENTO 925 al chilo"],
    ["gold_standard_silver_800_buyback", "€ 817,21", "Acquistiamo ARGENTO 800 al chilo"]
  ];
  for (const [key, token, label] of customerPrices) {
    for (const text of [page.replace(token, "non disponibile"), page.replace(token, "€ -1,00"), `${page} ${label} ${token.replace(/\d[\d.,]*/, "99,99")}`]) {
      const result = await makeExtractor(text).extractGoldStandardQuotes();
      assert.equal(result.status, "partial", key);
      assert.deepEqual(result.missing_fields.map((field) => field.field_key), [key]);
      assert.equal(result.excluded_fields.some((field) => field.field_key === key), false);
      assert.equal(result.quotes.some((quote) => quote.raw_payload.gold_standard_key === key), false);
    }
  }
});

test("Gold Standard source completion measures customer buyback prices rather than optional market references", async () => {
  const customersOnly = page.replace("Quotazione dell’oro in borsa € 115,21 /g ", "").replace("Quotazione dell’argento in borsa € 1.558,37 ", "");
  const result = await makeExtractor(customersOnly).extractGoldStandardQuotes();
  assert.equal(result.status, "success");
  assert.equal(result.quotes.length, 4);
  assert.equal(result.excluded_fields.length, 2);
  assert.ok(result.quotes.every((quote) => quote.quote_type === "customer_buyback"));
  const marketOnly = await makeExtractor("Quotazione dell’oro in borsa € 115,21 /g Quotazione dell’argento in borsa € 1.558,37 /kg").extractGoldStandardQuotes();
  assert.equal(marketOnly.status, "failed");
  assert.equal(marketOnly.missing_fields.length, 4);
});

test("an unavailable optional gold-market unit declaration does not turn verified buyback prices into a sync error", async () => {
  const extractor = createGoldStandardExtractor({ resolver, fetchImpl: async (url) => {
    if (new URL(url).pathname !== "/") throw Error("Optional market unit declaration unavailable");
    return new Response(`<main>${page.replace("€ 115,21 /g", "€ 115,21")}</main>`, { headers: { "content-type": "text/html" } });
  } });
  const result = await extractor.extractGoldStandardQuotes();
  assert.equal(result.status, "success");
  assert.equal(result.error, "");
  assert.deepEqual(result.warnings, []);
  assert.equal(result.quotes.length, 4);
  assert.equal(result.excluded_fields.length, 2);
});

test("Gold Standard guided and forced-AI checks preserve the exact excluded field and verified prices", async () => {
  const trainer = createCompetitorExtractionTrainer({ goldStandardExtractor: makeExtractor(page), fetchImpl: async () => { throw Error("Do not guess an excluded unit"); }, openai: { responses: { create: async () => { throw Error("Do not infer prices"); } } } });
  for (const forceAi of [false, true]) {
    const result = await trainer.testCompetitorExtraction(source, rules, { forceAi });
    assert.equal(result.status, "success");
    assert.equal(result.error, "");
    assert.equal(result.results[3].status, "excluded");
    assert.equal(result.results[3].value, null);
    assert.equal(result.results[3].error, "");
    assert.equal(result.quotes.length, 5);
    assert.ok(result.quotes.every((quote) => !quote.ai_extracted));
  }
});

test("an excluded Gold Standard reference cannot mask a missing customer price of the same purity", async () => {
  const text = page.replace("Quotazione dell’oro in borsa € 115,21 /g ", "").replace("€ 107,97 /g", "non disponibile");
  const trainer = createCompetitorExtractionTrainer({ goldStandardExtractor: makeExtractor(text) });
  const result = await trainer.testCompetitorExtraction(source, rules);
  assert.equal(result.status, "partial");
  assert.equal(result.results[0].status, "excluded");
  assert.equal(result.results[2].status, "not_found");
  assert.match(result.results[2].error, /nessun prezzo ufficiale/i);
});

test("Gold Standard exclusions do not silently approve unknown rules with matching metal and purity", async () => {
  const trainer = createCompetitorExtractionTrainer({ goldStandardExtractor: makeExtractor(page) });
  const result = await trainer.testCompetitorExtraction(source, [...rules, { ...rules[3], field_key: "unknown_silver_999_buyback", quote_type: "customer_buyback" }]);
  assert.equal(result.status, "partial");
  assert.equal(result.results.at(-1).status, "not_found");
});

test("Gold Standard summary explains its buyback scope and retains historical reference records", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const start = app.indexOf("function goldStandardSummaryHtml()");
  const code = app.slice(start, app.indexOf("function oroInEuroSummaryHtml()", start));
  const history = Object.freeze([{ metal: "silver", purity_code: "999", quote_type: "reference_market_silver_price", price_per_gram: 1234 }]);
  const state = { competitorSources: [{ ...source, last_sync_status: "success" }], competitorQuotes: history };
  const ctx = vm.createContext({ state, latestGoldStandardQuote: () => null, competitorSourceStatusLabel: (s) => s.last_sync_status === "success" ? "Aggiornato" : "Parziale", escapeHtml: String, isFounder: () => false });
  vm.runInContext(code, ctx);
  const html = ctx.goldStandardSummaryHtml();
  assert.match(html, /Aggiornato/);
  assert.match(html, /argento in borsa.*unità.*verificabil/i);
  assert.match(html, /Storico conservato/);
  assert.match(html, /stato.*prezzi di acquisto/i);
  assert.doesNotMatch(html, /1234/);
  assert.equal(state.competitorQuotes, history);
  assert.equal(history[0].price_per_gram, 1234);
});
