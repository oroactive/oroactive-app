import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AURUM_GOLD_COIN_CATALOG,
  buildGoldCoinKnowledgeAnswer,
  goldCoinKnowledgeSources,
  hasGoldCoinKnowledgeIntent,
  searchGoldCoinKnowledge
} from "../services/aurum/goldCoinKnowledge.js";
import { extractGoldCoinCatalog } from "../scripts/sync-aurum-gold-coins.mjs";

test("il catalogo Aurum è in parità esatta con l'Elenco Monete frontend", async () => {
  const frontend = extractGoldCoinCatalog(await readFile(new URL("../app.js", import.meta.url), "utf8"));
  assert.equal(frontend.length, 197);
  assert.equal(JSON.stringify(frontend), JSON.stringify(AURUM_GOLD_COIN_CATALOG.coins));
});

test("Aurum usa tutte le 197 schede tecniche e storiche dell'Elenco Monete", () => {
  assert.equal(AURUM_GOLD_COIN_CATALOG.catalogVersion, "2026.08.02");
  assert.equal(AURUM_GOLD_COIN_CATALOG.verifiedAt, "2 agosto 2026");
  assert.equal(AURUM_GOLD_COIN_CATALOG.coins.length, 197);
  assert.equal(new Set(AURUM_GOLD_COIN_CATALOG.coins.map((coin) => coin.id)).size, 197);

  for (const coin of AURUM_GOLD_COIN_CATALOG.coins) {
    assert.ok(coin.id, "id moneta mancante");
    assert.ok(coin.name, `${coin.id}: nome mancante`);
    assert.ok(coin.country, `${coin.id}: paese mancante`);
    assert.ok(coin.mintYears, `${coin.id}: periodo mancante`);
    assert.ok(coin.nominal, `${coin.id}: nominale mancante`);
    assert.ok(Number(coin.purity) > 0, `${coin.id}: titolo mancante`);
    assert.ok(Number(coin.grossWeight) > 0, `${coin.id}: peso lordo mancante`);
    assert.ok(Number(coin.fineGold) > 0, `${coin.id}: oro fino mancante`);
    assert.ok(Number(coin.diameter) > 0, `${coin.id}: diametro mancante`);
    assert.ok(coin.edge, `${coin.id}: bordo mancante`);
    assert.ok(coin.obverse, `${coin.id}: dritto mancante`);
    assert.ok(coin.reverse, `${coin.id}: rovescio mancante`);
    assert.ok(coin.history.length >= 80, `${coin.id}: storia insufficiente`);
    const sources = goldCoinKnowledgeSources([{ coin, score: 100 }], 6);
    assert.ok(sources.length >= 1, `${coin.id}: fonte istituzionale mancante`);
    sources.forEach((source) => assert.match(source.url, /^https:\/\//));
  }
});

const exactCases = [
  ["Qual è la storia della Sterlina oro 2022 Platinum Jubilee?", "sterlina-oro-2022-platinum-jubilee-fdc"],
  ["Specifiche del Marengo 20 Lire Vittorio Emanuele II", "marengo-20-lire-vittorio-emanuele-ii"],
  ["Peso e diametro del Krugerrand oro 1 oz", "krugerrand-1-oz"],
  ["Scheda Cina Panda oro 30 grammi", "cina-panda-oro-1-oz-30g"],
  ["Titolo del Messico Libertad oro 1 oz", "libertad-1-oz"],
  ["Dati tecnici American Eagle oro 1 oz", "american-eagle-1-oz"]
];

for (const [question, expectedId] of exactCases) {
  test(`Aurum recupera la scheda moneta corretta: ${expectedId}`, () => {
    const matches = searchGoldCoinKnowledge(question, { limit: 5 });
    assert.ok(matches.length);
    assert.equal(matches[0].coin.id, expectedId);
    assert.equal(hasGoldCoinKnowledgeIntent(question, matches), true);
  });
}

test("Aurum risponde con storia, specifiche, iconografia e fonti della moneta", () => {
  const question = "Raccontami storia e specifiche del Marengo 20 Lire Vittorio Emanuele II";
  const answer = buildGoldCoinKnowledgeAnswer(question, searchGoldCoinKnowledge(question, { limit: 5 }));
  assert.match(answer.risposta, /Marengo 20 Lire Vittorio Emanuele II/);
  assert.match(answer.risposta, /Storia/);
  assert.match(answer.risposta, /Titolo/);
  assert.match(answer.risposta, /Peso lordo/);
  assert.match(answer.risposta, /Oro fino/);
  assert.match(answer.risposta, /Diametro/);
  assert.match(answer.risposta, /Dritto/);
  assert.match(answer.risposta, /Rovescio/);
  assert.match(answer.risposta, /anno|variante|emissione/i);
  assert.ok(answer.sources.length >= 1);
});

test("Aurum distingue le domande numismatiche da oro generico e geologia", () => {
  assert.equal(hasGoldCoinKnowledgeIntent("Come si forma geologicamente l'oro?", searchGoldCoinKnowledge("Come si forma geologicamente l'oro?")), false);
  assert.equal(hasGoldCoinKnowledgeIntent("Quanto vale oggi l'oro usato?", searchGoldCoinKnowledge("Quanto vale oggi l'oro usato?")), false);
  const countryQuestion = "Quali monete d'oro francesi sono presenti nell'Elenco Monete?";
  const countryMatches = searchGoldCoinKnowledge(countryQuestion, { limit: 8 });
  assert.ok(countryMatches.length >= 2);
  assert.ok(countryMatches.every(({ coin }) => coin.country === "Francia"));
  assert.equal(hasGoldCoinKnowledgeIntent(countryQuestion, countryMatches), true);
});
