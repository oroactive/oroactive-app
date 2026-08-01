import assert from "node:assert/strict";
import test from "node:test";

import { searchCoachingKnowledge } from "../services/aurum/coachingKnowledge.js";
import {
  hasSaleDeedIntent,
  hasStrongComproOroSectorIntent,
  resolveAurumKnowledgeRoute
} from "../services/aurum/routing.js";
import {
  selectSaleDeedKnowledgeMatches,
  searchSaleDeedKnowledge
} from "../services/aurum/saleDeedKnowledge.js";
import { searchSectorKnowledge } from "../services/aurum/sectorKnowledge.js";

const regulatedCases = [
  "Quale comunicazione devo inviare all’OAM?",
  "Come gestire una comunicazione di operazione sospetta UIF?",
  "Che feedback devo dare al cliente sulla valutazione oro?",
  "Come creare una procedura di delega per il registro OAM?",
  "Come posso comunicare assertivamente al cliente il prezzo dell’oro?"
];

for (const question of regulatedCases) {
  test(`il settore regolamentato prevale sul coaching generico: ${question}`, () => {
    const coaching = searchCoachingKnowledge(question);
    const sector = searchSectorKnowledge(question, { limit: 5 });
    assert.ok(sector.length > 0);
    assert.equal(hasStrongComproOroSectorIntent(question, sector, coaching), true);
  });
}

for (const question of [
  "Che feedback devo dare al cliente sulla valutazione oro?",
  "Come posso comunicare assertivamente al cliente il prezzo dell’oro?"
]) {
  test(`la pipeline reale non confonde una consulenza settoriale con un campo dell'atto: ${question}`, () => {
    const coachingKnowledge = searchCoachingKnowledge(question);
    const sectorMatches = searchSectorKnowledge(question, { limit: 5 });
    const saleMatches = selectSaleDeedKnowledgeMatches(searchSaleDeedKnowledge(question, { limit: 5 }));
    assert.equal(hasSaleDeedIntent(question, saleMatches), false);
    const route = resolveAurumKnowledgeRoute({
      question,
      saleMatches,
      sectorMatches,
      coachingKnowledge
    });
    assert.equal(route.hasSaleDeedContext, false);
    assert.equal(route.hasGemologicalContext, false);
    assert.equal(route.strongSectorPriority, true);
  });
}

test("la guida atto prevale solo con un campo, il modulo o la sezione pratica espliciti", () => {
  const question = "Come compilo il campo cliente nell’atto di vendita?";
  const saleMatches = selectSaleDeedKnowledgeMatches(searchSaleDeedKnowledge(question, { limit: 5 }));
  const sectorMatches = searchSectorKnowledge(question, { limit: 5 });
  const coachingKnowledge = searchCoachingKnowledge(question);
  assert.equal(resolveAurumKnowledgeRoute({
    question,
    saleMatches,
    sectorMatches,
    coachingKnowledge
  }).hasSaleDeedContext, true);
  assert.equal(resolveAurumKnowledgeRoute({
    question: "Spiegami il cliente",
    section: "nuovo_atto_vendita",
    saleMatches,
    sectorMatches,
    coachingKnowledge
  }).hasSaleDeedContext, true);
  assert.equal(resolveAurumKnowledgeRoute({
    question: "Spiegami questo campo",
    requestedFieldId: "customer_name",
    saleMatches: [{ field: { id: "customer_name" }, score: 10_000 }],
    sectorMatches,
    coachingKnowledge
  }).hasSaleDeedContext, true);
});

for (const question of [
  "Come posso dare feedback costruttivo al mio team?",
  "Sono stressato dal lavoro e voglio ridefinire le priorità"
]) {
  test(`il coaching professionale resta coaching: ${question}`, () => {
    const coaching = searchCoachingKnowledge(question);
    const sector = searchSectorKnowledge(question, { limit: 5 });
    assert.ok(coaching.matches.length > 0);
    assert.equal(hasStrongComproOroSectorIntent(question, sector, coaching), false);
  });
}

for (const question of [
  "Come funziona il lavoro del commercialista per un negozio compro oro?",
  "Come registro in prima nota l’acquisto di oro da un privato?",
  "Quale regime IVA applico a un lotto venduto alla fonderia?",
  "Come riconcilio rimanenze, cali di fusione e fattura della raffineria?",
  "Come ammortizzo lo strumento XRF tra i cespiti?"
]) {
  test(`la consulenza contabile del compro oro resta nel settore specialistico: ${question}`, () => {
    const coaching = searchCoachingKnowledge(question);
    const sector = searchSectorKnowledge(question, { limit: 5 });
    assert.ok(sector.length > 0);
    assert.equal(hasStrongComproOroSectorIntent(question, sector, coaching), true);
    assert.equal(resolveAurumKnowledgeRoute({
      question,
      sectorMatches: sector,
      coachingKnowledge: coaching
    }).strongSectorPriority, true);
  });
}
