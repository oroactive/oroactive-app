import test from "node:test";
import assert from "node:assert/strict";
import { createGoldStandardExtractor, extractGoldStandardQuotesFromText } from "../services/competitors/extractors/goldStandardExtractor.js";
import { createOroInEuroExtractor, extractOroInEuroQuotesFromText } from "../services/competitors/extractors/oroInEuroExtractor.js";
import { createGruppoOro24kExtractor, extractGruppoOro24kQuotesFromText } from "../services/competitors/extractors/gruppoOro24kExtractor.js";

const resolver = async () => [{ address: "8.8.8.8", family: 4 }];
const response = (body) => new Response(`<main>${body}</main>`, { headers: { "content-type": "text/html" } });
// Official pages inspected on 2026-10-19, approximately 21:22 Europe/Rome.
// These are deterministic test fixtures, never runtime prices or fallbacks.
const goldStandardBare = "Quotazione dell’oro in borsa € 119,62 Acquistiamo ORO 18K al prezzo MIN € 76,34 Acquistiamo ORO 24K al prezzo MIN € 112,11 Quotazione dell’argento in borsa € 1.649,04 Acquistiamo ARGENTO 925 al chilo € 999,87 Acquistiamo ARGENTO 800 al chilo € 864,75";
const goldStandard = goldStandardBare.replace("€ 119,62", "€ 119,62 /g").replace("€ 76,34", "€ 76,34 /g").replace("€ 112,11", "€ 112,11 /g");
const goldUnitUrl = "https://www.goldstandard.gold/da-gioiello-a-denaro-il-processo-di-valutazione-delloro/";
const goldUnitText = "L’altro elemento essenziale è la quotazione dell’oro del giorno, ovvero il valore di mercato dell’oro in tempo reale. Questo valore cambia ogni giorno e viene espresso in euro per grammo.";
const goldUnitEvidence = { unit: "EUR/g", source_url: goldUnitUrl, text: goldUnitText };
const oroInEuro = "Oro 750/1000 76,65 € /Grammo Oro 999/1000 111,59 € /Grammo Argento 999/1000 1,23 € /Grammo";
const gruppo = "Quotazioni in tempo reale delle 21:21:11 del 19/10/2026 ORO 24 Carati Compro Oro 24 Carati 108.60 Euro/Gr. ORO 18 Carati Compro Oro 18 Carati 75.75 Euro/Gr. Argento 999 Compro Argento 999 0.88 Euro/Gr. Argento 800 Compro Argento 800 0.65 Euro/Gr.";
const byField = (quotes, key) => quotes.find((q) => [q.raw_payload?.gold_standard_key, q.raw_payload?.oro_in_euro_key, q.raw_payload?.gruppo_oro_24k_key].includes(key));
const cases = [
  { name: "Gold Standard", create: createGoldStandardExtractor, run: "extractGoldStandardQuotes", parse: extractGoldStandardQuotesFromText, text: goldStandard, key: "gold_standard_gold_18kt_buyback", token: "€ 76,34 /g", bad: ["€ -76,34", "€ 0,00", "76,34 USD/g", "76,34 €/kg"], label: "Acquistiamo ORO 18K al prezzo MIN" },
  { name: "Oro in Euro", create: createOroInEuroExtractor, run: "extractOroInEuroQuotes", parse: extractOroInEuroQuotesFromText, text: oroInEuro, key: "oro_in_euro_gold_18kt", token: "76,65 € /Grammo", bad: ["-76,65 € /Grammo", "0,00 € /Grammo", "76,65 $/Grammo", "76,65 €/kg"], label: "Oro 750/1000" },
  { name: "Gruppo Oro 24K", create: createGruppoOro24kExtractor, run: "extractGruppoOro24kQuotes", parse: extractGruppoOro24kQuotesFromText, text: gruppo, key: "gruppo_oro_24k_gold_24kt", token: "108.60 Euro/Gr.", bad: ["-108.60 Euro/Gr.", "0.00 Euro/Gr.", "108.60 USD/Gr.", "108600 Euro/kg"], label: "ORO 24 Carati Compro Oro 24 Carati" },
];

for (const fixture of cases) {
  test(`${fixture.name} never takes a missing field's price from the following label`, () => {
    const quotes = fixture.parse(fixture.text.replace(fixture.token, "non disponibile"));
    assert.equal(byField(quotes, fixture.key), undefined);
    assert.ok(quotes.length > 0);
  });

  test(`${fixture.name} rejects nonpositive prices, foreign currency and incompatible units`, () => {
    for (const bad of fixture.bad) {
      assert.equal(byField(fixture.parse(fixture.text.replace(fixture.token, bad)), fixture.key), undefined, bad);
    }
  });

  test(`${fixture.name} rejects conflicting duplicate fields but accepts matching duplicates`, () => {
    const duplicate = `${fixture.text} ${fixture.label} ${fixture.token}`;
    assert.ok(byField(fixture.parse(duplicate), fixture.key));
    const conflicting = `${fixture.text} ${fixture.label} ${fixture.token.replace(/\d[\d.,]*/, "77,77")}`;
    assert.equal(byField(fixture.parse(conflicting), fixture.key), undefined);
  });

  test(`${fixture.name} reports verified-only missing fields and never calls AI`, async () => {
    let calls = 0;
    const openai = { responses: { create: async () => { calls++; throw new Error("AI must not replace official evidence"); } } };
    const extractor = fixture.create({ resolver, useAiFallback: true, openai, fetchImpl: async () => response(fixture.text.replace(fixture.token, "non disponibile")) });
    const result = await extractor[fixture.run]();
    assert.equal(calls, 0);
    assert.equal(result.verified_only, true);
    assert.equal(result.status, "partial");
    assert.ok(result.missing_fields.some((field) => field.field_key === fixture.key && field.metal && field.purity_code && field.quote_type && field.error));
    assert.ok(result.quotes.every((quote) => !quote.ai_extracted && quote.source_url && quote.evidence_text && quote.raw_payload.verified_official === true));
  });

  test(`${fixture.name} fails visibly when the official page contains no verified price`, async () => {
    const result = await fixture.create({ resolver, fetchImpl: async () => response("Pagina temporaneamente non disponibile") })[fixture.run]();
    assert.equal(result.status, "failed");
    assert.equal(result.verified_only, true);
    assert.equal(result.quotes.length, 0);
    assert.ok(result.missing_fields.length >= 3);
    assert.ok(result.error);
  });
}

test("Gold Standard keeps market references separate from customer MIN prices and preserves explicit kilogram units", () => {
  const quotes = extractGoldStandardQuotesFromText(goldStandard);
  assert.equal(byField(quotes, "gold_standard_gold_24kt_reference").quote_type, "reference_market_gold_price");
  assert.equal(byField(quotes, "gold_standard_gold_24kt_buyback").price_per_gram, 112.11);
  assert.equal(byField(quotes, "gold_standard_gold_24kt_buyback").raw_payload.price_kind, "min_price");
  assert.equal(byField(quotes, "gold_standard_silver_925_buyback").price_per_gram, 0.99987);
  assert.equal(byField(quotes, "gold_standard_silver_925_buyback").price_per_kg, 999.87);
  assert.equal(byField(quotes, "gold_standard_silver_800_buyback").price_per_gram, 0.86475);
});

test("Gold Standard does not infer the market silver unit from its numerical magnitude", async () => {
  const result = await createGoldStandardExtractor({ resolver, fetchImpl: async () => response(goldStandard) }).extractGoldStandardQuotes();
  assert.equal(byField(result.quotes, "gold_standard_silver_reference"), undefined);
  assert.equal(result.status, "partial");
  assert.equal(result.quotes.length, 5);
  assert.deepEqual(result.missing_fields.map((field) => field.field_key), ["gold_standard_silver_reference"]);
  assert.match(result.missing_fields[0].error, /unità|unita|kg/i);
});

test("Gold Standard verifies all six fields only when silver market units are explicitly published", async () => {
  const explicit = goldStandard.replace("€ 1.649,04", "€ 1.649,04 /kg");
  const result = await createGoldStandardExtractor({ resolver, fetchImpl: async () => response(explicit) }).extractGoldStandardQuotes();
  assert.equal(result.status, "success");
  assert.equal(result.quotes.length, 6);
  assert.deepEqual(result.missing_fields, []);
  assert.equal(byField(result.quotes, "gold_standard_silver_reference").price_per_gram, 1.64904);
});

test("Oro in Euro preserves the published fineness and EUR/g prices", async () => {
  const result = await createOroInEuroExtractor({ resolver, fetchImpl: async () => response(oroInEuro) }).extractOroInEuroQuotes();
  assert.equal(result.status, "success");
  assert.equal(result.verified_only, true);
  assert.deepEqual(result.missing_fields, []);
  assert.deepEqual(result.quotes.map((q) => [q.purity_code, q.price_per_gram]), [["18kt", 76.65], ["24kt", 111.59], ["999", 1.23]]);
  assert.equal(byField(result.quotes, "oro_in_euro_gold_24kt").purity_value, 0.999);
  assert.equal(byField(result.quotes, "oro_in_euro_gold_24kt").raw_payload.fineness_per_mille, 999);
});

test("Gruppo Oro 24K preserves a timezone-less provider timestamp without inventing its ISO instant", () => {
  for (const stamp of ["21:21:11 del 19/10/2026", "09:15:00 del 19/12/2026"]) {
    const fetchedAt = "2026-10-19T19:22:31.000Z";
    const quotes = extractGruppoOro24kQuotesFromText(gruppo.replace("21:21:11 del 19/10/2026", stamp), { quoteDate: fetchedAt });
    assert.equal(quotes.length, 4);
    for (const quote of quotes) {
      assert.equal(quote.quote_date, fetchedAt);
      assert.equal(quote.raw_payload.provider_timestamp, null);
      assert.match(quote.raw_payload.provider_timestamp_text, new RegExp(stamp.replaceAll("/", "\\/")));
    }
  }
});

test("Gruppo Oro 24K records 999/1000 fineness only when the official source documents it", () => {
  const documented = `${gruppo} Per ogni grammo di 24 kt (999/1000) oggi la nostra valutazione è di: 108.60 Euro al Grammo`;
  const quote = byField(extractGruppoOro24kQuotesFromText(documented), "gruppo_oro_24k_gold_24kt");
  assert.equal(quote.purity_value, 0.999);
  assert.equal(quote.raw_payload.fineness_per_mille, 999);
  const undocumented = byField(extractGruppoOro24kQuotesFromText(gruppo), "gruppo_oro_24k_gold_24kt");
  assert.notEqual(undocumented.raw_payload.fineness_per_mille, 999);
});

test("unpublished prices hidden in scripts or comments do not become verified quotes", () => {
  for (const fixture of cases) {
    const hidden = fixture.parse(`<script>${fixture.text}</script><!-- ${fixture.text} -->`);
    assert.equal(hidden.length, 0, fixture.name);
  }
});


test("Gold Standard does not assume gold EUR/g from a bare euro amount", () => {
  const quotes = extractGoldStandardQuotesFromText(goldStandardBare);
  assert.equal(quotes.some((quote) => quote.metal === "gold"), false);
  assert.deepEqual(quotes.map((quote) => quote.purity_code), ["925", "800"]);
});

test("Gold Standard pure parsing accepts bare gold only with explicit official unit evidence", () => {
  const quotes = extractGoldStandardQuotesFromText(goldStandardBare, { goldUnitEvidence });
  assert.equal(quotes.filter((quote) => quote.metal === "gold").length, 3);
  for (const quote of quotes.filter((quote) => quote.metal === "gold")) assert.deepEqual(quote.raw_payload.unit_evidence, goldUnitEvidence);
  for (const invalid of [
    { ...goldUnitEvidence, source_url: "https://example.com/unit" },
    { ...goldUnitEvidence, unit: "EUR/kg" },
    { ...goldUnitEvidence, text: "La quotazione cambia ogni giorno." },
    { ...goldUnitEvidence, text: "La quotazione dell’argento è espressa in euro per grammo." },
  ]) assert.equal(extractGoldStandardQuotesFromText(goldStandardBare, { goldUnitEvidence: invalid }).some((quote) => quote.metal === "gold"), false);
});

test("Gold Standard factory fetches the official unit declaration before verifying bare gold prices", async () => {
  const calls = [];
  const result = await createGoldStandardExtractor({ resolver, fetchImpl: async (url) => {
    calls.push(String(url));
    return response(String(url) === goldUnitUrl ? goldUnitText : goldStandardBare);
  } }).extractGoldStandardQuotes();
  assert.ok(calls.includes(goldUnitUrl));
  assert.equal(result.quotes.filter((quote) => quote.metal === "gold").length, 3);
  assert.equal(result.quotes.length, 5);
  assert.equal(result.status, "partial");
  for (const quote of result.quotes.filter((quote) => quote.metal === "gold")) assert.deepEqual(quote.raw_payload.unit_evidence, goldUnitEvidence);
  assert.ok(result.pages_analyzed.includes(goldUnitUrl));
  assert.deepEqual(result.missing_fields.map((field) => field.field_key), ["gold_standard_silver_reference"]);
});

test("Gold Standard recognizes the HTML-encoded unit declaration served by its official article", async () => {
  // The live article served on 2026-10-20 encodes è as &egrave;.
  for (const encodedE of ["&egrave;", "&#232;", "&#xE8;"]) {
    const article = goldUnitText.replace("L’altro", "L&#8217;altro").replace(" è ", ` ${encodedE} `);
    const result = await createGoldStandardExtractor({ resolver, fetchImpl: async (url) =>
      response(String(url) === goldUnitUrl ? `<p>${article}</p>` : goldStandardBare)
    }).extractGoldStandardQuotes();
    assert.equal(result.quotes.filter((quote) => quote.metal === "gold").length, 3, encodedE);
    assert.equal(result.quotes.length, 5, encodedE);
    for (const quote of result.quotes.filter((quote) => quote.metal === "gold")) {
      assert.deepEqual(quote.raw_payload.unit_evidence, goldUnitEvidence, encodedE);
    }
    assert.deepEqual(result.missing_fields.map((field) => field.field_key), ["gold_standard_silver_reference"], encodedE);
  }
});

test("Gold Standard withholds bare gold if the official unit declaration is missing or unreachable", async () => {
  for (const unavailable of [false, true]) {
    const result = await createGoldStandardExtractor({ resolver, fetchImpl: async (url) => {
      if (String(url) === goldUnitUrl) {
        if (unavailable) throw new Error("official declaration unavailable");
        return response("La quotazione dell’oro viene aggiornata, senza indicazione dell’unità.");
      }
      return response(goldStandardBare);
    } }).extractGoldStandardQuotes();
    assert.equal(result.status, "partial");
    assert.equal(result.quotes.some((quote) => quote.metal === "gold"), false);
    assert.deepEqual(result.quotes.map((quote) => quote.purity_code), ["925", "800"]);
    assert.equal(result.missing_fields.length, 4);
  }
});

test("Gruppo Oro 24K retains the official Milan-only geographic price restriction", () => {
  const source = `La quotazione esposta sul sito e' il nostro prezzo di acquisto reale senza sorprese. ${gruppo} Solo nel nostro negozio a Milano trovi le quotazioni indicate qui a fianco.`;
  const quotes = extractGruppoOro24kQuotesFromText(source);
  assert.equal(quotes.length, 4);
  for (const quote of quotes) {
    assert.match(quote.raw_payload.conditions, /prezzo di acquisto reale senza sorprese/);
    assert.match(quote.raw_payload.conditions, /Solo nel nostro negozio a Milano trovi le quotazioni indicate qui a fianco/);
    assert.doesNotMatch(quote.raw_payload.conditions, /Parma|Cremona/);
  }
});

for (const fixture of [
  {name:'Gold Standard',create:createGoldStandardExtractor,run:'extractGoldStandardQuotes',text:goldStandard,key:'gold_standard_gold_24kt_buyback',price:112.11,token:'112,11',path:'/quotazione-oro-milano/'},
  {name:'Oro in Euro',create:createOroInEuroExtractor,run:'extractOroInEuroQuotes',text:oroInEuro,key:'oro_in_euro_gold_24kt',price:111.59,token:'111,59',path:'/quotazioni-oro/'}
]) test(`${fixture.name} reads the current quote panel once without mixing prices from linked articles`,async()=>{
 const calls=[];
 const r=await fixture.create({resolver,fetchImpl:async(url)=>{calls.push(String(url));const primary=new URL(url).pathname==='/';return response(primary?fixture.text+` <a href="${fixture.path}">Quotazione oro</a>`:fixture.text.replace(fixture.token,'777,77'));}})[fixture.run]();
 assert.equal(byField(r.quotes,fixture.key)?.price_per_gram,fixture.price);
 assert.equal(calls.length,1);
});
