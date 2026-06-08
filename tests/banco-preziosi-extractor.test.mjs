import test from "node:test";
import assert from "node:assert/strict";

import {
  dedupeBancoPreziosiQuotes,
  extractBancoPreziosiQuotesFromText
} from "../services/competitors/extractors/bancoPreziosiExtractor.js";

test("Banco Preziosi preferisce il riquadro pubblico aggiornato rispetto al post legacy", () => {
  const homeQuotes = extractBancoPreziosiQuotesFromText(`
    Quotazione ufficiale oro euro 119,95 al grammo
    ORO 18kt € 84,05 al grammo
    ARGENTO 925 € 1350,00 al KG
    ARGENTO 800 € 1200,00 al Kg
  `, { sourceUrl: "https://www.bancopreziosimilano.it/" });

  const legacyQuotes = extractBancoPreziosiQuotesFromText(`
    Quotazioni Ufficiali ORO e ARGENTO
    Valore di acquisto ORO € 123,80 al grammo
    Acquistiamo Oro 18k a € 87,05 al grammo
    Acquistiamo ARGENTO 925 a € 1635,00 al kg
  `, { sourceUrl: "https://www.bancopreziosimilano.it/quotazioni-oro-in-tempo-reale-milano/" });

  const merged = dedupeBancoPreziosiQuotes([...legacyQuotes, ...homeQuotes]);
  const byCode = Object.fromEntries(merged.map((quote) => [quote.purity_code, quote]));

  assert.equal(byCode["18kt"].price_per_gram, 84.05);
  assert.equal(byCode["925"].price_per_kg, 1350);
  assert.equal(byCode["800"].price_per_kg, 1200);
  assert.equal(byCode["18kt"].raw_payload.source_method, "public_home_quote_section");
  assert.equal(byCode["925"].source_url, "https://www.bancopreziosimilano.it/");
});
