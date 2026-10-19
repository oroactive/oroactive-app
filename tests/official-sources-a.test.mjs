import test from "node:test";
import assert from "node:assert/strict";
import { createAmicoOroExtractor, extractAmicoOroQuotesFromText } from "../services/competitors/extractors/amicoOroExtractor.js";
import { createBordinExtractor, extractBordinQuotesFromText } from "../services/competitors/extractors/bordinExtractor.js";
import { createProntoGoldExtractor, extractProntoGoldQuotesFromText } from "../services/competitors/extractors/prontoGoldExtractor.js";

// Official public-page captures from 2026-10-19. Fixtures are never runtime defaults.
const amico = "Quotazioni in tempo reale ORO 24K al gr = 110.91 € 18K al gr = 75.53 € 14K al gr = 56.39 € ARGENTO 999 al Kg = 999.18 € 925 al Kg = 795.24 € 800 al Kg = 699.34 € Data l'alta volatilità dei mercati attualmente è possibile bloccare il prezzo alla quotazione esposta solo al momento delle vendita in negozio per minimo 35 grammi di oro e 2kg di argento";
const bordin = "Quotazione Oro Oro 24kt - 999,9‰ 112.39 € / gr Oro 18kt - 750‰ 76.86 € / gr Oro 14kt - 585‰ 56.92 € / gr Quotazione aggiornata il 19-10-2026 21:01:00 Offerta valida per quantitativi superiori a 35 grammi. Quotazione Argento Argento 999‰ 1.18 € / gr Argento 925‰ 0.83 € / gr Argento 800‰ 0.70 € / gr Quotazione aggiornata il 19-10-2026 21:01:00 Offerta valida per quantitativi superiori a 1000 grammi.";
const pronto = "Aggiornamento: Lunedì 19-10-26 19:59:58 Acquistiamo Oro Valore dell'ORO sulle Borse internazionali 118.65 Euro/Grammo ORO PURO 24k Acquisto 112.55 Euro/Grammo Vendita 120.65 Euro/Grammo Compro ORO usato 18k da 75.34 Euro/Grammo a 76.84 Euro/Grammo Compro ORO usato 14k Acquisto 59.99 Euro/Grammo Compro ORO usato 9k Acquisto 34.78 Euro/Grammo Acquistiamo Argento Valore dell'ARGENTO sulle Borse internazionali 1.634 Euro/Grammo ARGENTO PURO Acquisto 1.324 Euro/Grammo Vendita 1.734 Euro/Grammo Compro ARGENTO usato 925 Acquisto 1.030 Euro/Grammo Compro ARGENTO usato 800 Acquisto 0.833 Euro/Grammo";
const resolver = async () => [{ address: "8.8.8.8", family: 4 }];
const cases = [
  { name: "Amico Oro", fixture: amico, create: createAmicoOroExtractor, method: "extractAmicoOroQuotes", parse: extractAmicoOroQuotesFromText, count: 6, key: "amico_oro_key", first: "24K al gr = 110.91 €", next: "18K al gr = 75.53 €", bad: ["24K al gr = -110.91 €", "24K al gr = 0 €", "24K al gr = 110.91 $", "24K al kg = 110.91 €"], duplicate: "24K al gr = 111.91 €", price: 110.91 },
  { name: "Bordin", fixture: bordin, create: createBordinExtractor, method: "extractBordinQuotes", parse: extractBordinQuotesFromText, count: 6, key: "bordin_key", first: "Oro 24kt - 999,9‰ 112.39 € / gr", next: "Oro 18kt - 750‰ 76.86 € / gr", bad: ["Oro 24kt - 999,9‰ -112.39 € / gr", "Oro 24kt - 999,9‰ 0 € / gr", "Oro 24kt - 999,9‰ 112.39 $ / gr", "Oro 24kt - 999,9‰ 112.39 € / kg"], duplicate: "Oro 24kt - 999,9‰ 113.39 € / gr", price: 112.39 },
  { name: "Pronto Gold", fixture: pronto, create: createProntoGoldExtractor, method: "extractProntoGoldQuotes", parse: extractProntoGoldQuotesFromText, count: 11, key: "pronto_gold_key", first: "ORO PURO 24k Acquisto 112.55 Euro/Grammo", next: "Vendita 120.65 Euro/Grammo", bad: ["ORO PURO 24k Acquisto -112.55 Euro/Grammo", "ORO PURO 24k Acquisto 0 Euro/Grammo", "ORO PURO 24k Acquisto 112.55 USD/Grammo", "ORO PURO 24k Acquisto 112.55 Euro/kg"], duplicate: "ORO PURO 24k Acquisto 113.55 Euro/Grammo", price: 112.55 }
];

for (const source of cases) {
  test(`${source.name}: all monitored official fields are deterministic and verified`, async () => {
    const before = Date.now();
    const result = await source.create({ resolver, fetchImpl: async () => new Response(`<p>${source.fixture}</p>`, { headers: { "content-type": "text/html" } }) })[source.method]();
    assert.equal(result.status, "success");
    assert.equal(result.verified_only, true);
    assert.deepEqual(result.missing_fields, []);
    assert.equal(result.quotes.length, source.count);
    assert.equal(result.error, "");
    assert.ok(result.quotes.every((q) => q.ai_extracted === false && q.evidence_text && q.source_url && q.raw_payload[source.key] && q.raw_payload.verified_official === true));
    assert.ok(result.quotes.every((q) => Date.parse(q.quote_date) >= before && Date.parse(q.quote_date) <= Date.now()));
  });

  test(`${source.name}: no adjacent, negative, zero, foreign-currency or wrong-unit quote`, () => {
    for (const replacement of [source.first.replace(/[0-9]+\.[0-9]+(?=\s*(?:€|Euro))/, "non disponibile"), ...source.bad]) {
      const quotes = source.parse(source.fixture.replace(source.first, replacement));
      assert.equal(quotes.some((q) => q.metal === "gold" && q.purity_code === "24kt" && q.quote_type === "customer_buyback"), false, replacement);
      assert.ok(quotes.some((q) => q.metal === "gold" && q.purity_code === "18kt"), "unrelated verified field remains available");
    }
  });

  test(`${source.name}: conflicting duplicate is withheld; identical duplicate is deduplicated`, () => {
    const same = source.parse(`${source.fixture} ${source.first}`);
    assert.equal(same.filter((q) => q.metal === "gold" && q.purity_code === "24kt" && q.quote_type === "customer_buyback").length, 1);
    const conflict = source.parse(`${source.fixture} ${source.duplicate}`);
    assert.equal(conflict.some((q) => q.metal === "gold" && q.purity_code === "24kt" && q.quote_type === "customer_buyback"), false);
  });

  test(`${source.name}: missing fields stay missing even with AI fallback enabled`, async () => {
    let aiCalls = 0;
    const openai = { responses: { create: async () => { aiCalls += 1; throw new Error("unverified AI must not be called"); } } };
    const fixture = source.fixture.replace(source.first, source.first.replace(/[0-9]+\.[0-9]+(?=\s*(?:€|Euro))/, "non disponibile"));
    const result = await source.create({ resolver, openai, useAiFallback: true, useAiVisionFallback: true, fetchImpl: async () => new Response(`<p>${fixture}</p>`, { headers: { "content-type": "text/html" } }) })[source.method]({ forceAi: true });
    assert.equal(aiCalls, 0);
    assert.equal(result.verified_only, true);
    assert.equal(result.status, "partial");
    assert.ok(result.missing_fields.some((field) => field.field_key && field.metal === "gold" && field.purity_code === "24kt" && field.quote_type === "customer_buyback" && field.error));
  });
}

test("Amico Oro keeps exact silver-unit conversion and official quantity conditions", () => {
  const quotes = extractAmicoOroQuotesFromText(amico);
  assert.equal(quotes.find((q) => q.metal === "silver" && q.purity_code === "999").price_per_gram, 0.99918);
  for (const quote of quotes) {
    assert.equal(quote.raw_payload.min_quantity_grams, quote.metal === "gold" ? 35 : 2000);
    assert.ok(quote.raw_payload.condition_text);
  }
});

test("Bordin keeps separate gold and silver quantity conditions and original timestamp text", () => {
  const quotes = extractBordinQuotesFromText(bordin);
  for (const quote of quotes) {
    assert.equal(quote.raw_payload.min_quantity_grams, quote.metal === "gold" ? 35 : 1000);
    assert.equal(quote.raw_payload.provider_timestamp_text, "19-10-2026 21:01:00");
    assert.equal(quote.raw_payload.provider_timestamp, null);
  }
});

test("Pronto Gold preserves published range, decimal precision and distinct reference/buy/sell semantics", () => {
  const quotes = extractProntoGoldQuotesFromText(pronto);
  const range = quotes.find((q) => q.purity_code === "18kt");
  assert.equal(range.price_per_gram, 76.84);
  assert.equal(range.raw_payload.range_min_per_gram, 75.34);
  assert.equal(range.raw_payload.range_max_per_gram, 76.84);
  assert.equal(quotes.find((q) => q.purity_code === "925").price_per_gram, 1.03);
  assert.deepEqual(quotes.filter((q) => q.metal === "gold" && q.purity_code === "24kt").map((q) => [q.quote_type, q.price_per_gram]), [["reference_market_gold_price", 118.65], ["customer_buyback", 112.55], ["sell_price", 120.65]]);
  assert.ok(quotes.every((q) => q.raw_payload.provider_timestamp === null && q.raw_payload.provider_timestamp_text === "Lunedì 19-10-26 19:59:58"));
});

test("Bordin does not borrow a quantity condition when its metal section is absent", () => {
  for (const [metal, heading, condition] of [
    ["gold", "Quotazione Oro", "Offerta valida per quantitativi superiori a 35 grammi."],
    ["silver", "Quotazione Argento", "Offerta valida per quantitativi superiori a 1000 grammi."]
  ]) {
    const source = bordin.replace(heading, "").replace(condition, "");
    const quotes = extractBordinQuotesFromText(source, { conditionText: "Not official evidence", minQuantityGrams: 99 });
    assert.ok(quotes.some((q) => q.metal === metal));
    for (const quote of quotes.filter((q) => q.metal === metal)) {
      assert.equal(quote.raw_payload.min_quantity_grams, null);
      assert.equal(quote.raw_payload.condition, "");
      assert.equal(quote.raw_payload.condition_text, "");
    }
  }
});

test("Amico Oro, Bordin and Pronto Gold never verify prices hidden in scripts or HTML comments", () => {
  for (const source of cases) {
    assert.equal(source.parse(`<script>${source.fixture}</script><!-- ${source.fixture} -->`).length, 0, source.name);
  }
});
