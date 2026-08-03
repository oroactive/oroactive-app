import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GEM_CATALOG_SEED } from "../services/academy/gemologicalCatalog.js";
import {
  AURUM_SECTOR_KNOWLEDGE,
  buildSectorKnowledgeAnswer,
  formatSectorKnowledgeContext,
  searchSectorKnowledge
} from "../services/aurum/sectorKnowledge.js";
import { resolveAurumKnowledgeRoute } from "../services/aurum/routing.js";

const [appSource, serverSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../server.js", import.meta.url), "utf8")
]);

const expectedTopicIds = [
  "estrazione-ciclo-minerario-esplorazione-risorse",
  "estrazione-oro-beneficiamento-recupero",
  "estrazione-argento-sottoprodotto-concentrati",
  "estrazione-platino-pge-concentrazione",
  "estrazione-campionamento-assay-qaqc",
  "estrazione-recuperi-bilancio-massa",
  "estrazione-hse-acque-tailings-chiusura",
  "estrazione-responsabile-asm-tracciabilita",
  "estrazione-diamanti-primari-secondari-recovery",
  "estrazione-gemme-corindoni-spinelli-granati",
  "estrazione-gemme-berilli-pegmatiti-quarzi",
  "estrazione-gemme-varie-zircone-tanzanite-opali",
  "estrazione-gemme-ornamentali-giade-turchese-lapislazzuli",
  "perle-naturali-coltivate-raccolta-filiera",
  "materiali-organici-corallo-ambra-provenienza",
  "materiali-non-estratti-sintetici-trattati-assemblati-simulanti"
];

const extractionTopics = () => AURUM_SECTOR_KNOWLEDGE.topics.filter(
  (topic) => topic.category === "Estrazione e approvvigionamento responsabile"
);

test("Aurum carica sedici moduli avanzati di estrazione e filiera", () => {
  assert.equal(AURUM_SECTOR_KNOWLEDGE.knowledgeVersion, "2026.08.03-estrazione-preziosi-gemme");
  assert.equal(AURUM_SECTOR_KNOWLEDGE.verifiedAt, "3 agosto 2026");
  const topics = new Map(extractionTopics().map((topic) => [topic.id, topic]));
  assert.equal(topics.size, expectedTopicIds.length);
  expectedTopicIds.forEach((id) => {
    const topic = topics.get(id);
    assert.ok(topic, `topic mancante: ${id}`);
    assert.ok(topic.facts.length >= 4, `fatti insufficienti: ${id}`);
    assert.ok(topic.checklist.length >= 3, `checklist insufficiente: ${id}`);
    assert.ok(topic.warnings.length >= 2, `avvertenze insufficienti: ${id}`);
    assert.ok(topic.sources.length >= 2, `fonti insufficienti: ${id}`);
    topic.sources.forEach((source) => {
      assert.match(source.url, /^https:\/\//);
      assert.equal(source.verifiedAt, "3 agosto 2026");
      assert.ok(source.authority);
    });
  });
});

test("la mappa estrattiva copre una volta sola tutti i 61 materiali del Laboratorio", () => {
  const profiles = extractionTopics().flatMap((topic) => topic.materials || []);
  const catalogSlugs = GEM_CATALOG_SEED.map((material) => material.slug).sort();
  const coveredSlugs = profiles.map((profile) => profile.slug).sort();
  assert.equal(profiles.length, 61);
  assert.deepEqual(coveredSlugs, catalogSlugs);
  assert.equal(new Set(coveredSlugs).size, catalogSlugs.length);
  profiles.forEach((profile) => {
    assert.ok(profile.name, `${profile.slug}: nome mancante`);
    assert.ok(profile.classification, `${profile.slug}: classificazione mancante`);
    assert.ok(profile.occurrence.length >= 24, `${profile.slug}: giacimento/origine insufficiente`);
    assert.ok(profile.extraction.length >= 24, `${profile.slug}: estrazione insufficiente`);
    assert.ok(profile.primaryProcessing.length >= 24, `${profile.slug}: prima lavorazione insufficiente`);
    assert.ok(profile.caveat.length >= 20, `${profile.slug}: cautela insufficiente`);
  });
});

const retrievalCases = [
  ["Come si progetta esplorazione e sviluppo di una miniera?", "estrazione-ciclo-minerario-esplorazione-risorse"],
  ["Come si estrae l'oro e come avviene il recupero dal minerale?", "estrazione-oro-beneficiamento-recupero"],
  ["Come viene recuperato l'argento da concentrati di piombo e zinco?", "estrazione-argento-sottoprodotto-concentrati"],
  ["Come si estraggono e concentrano platino palladio e PGE?", "estrazione-platino-pge-concentrazione"],
  ["Come imposto campionamento, assay e QAQC in miniera?", "estrazione-campionamento-assay-qaqc"],
  ["Come calcolo recupero metallurgico e bilancio di massa?", "estrazione-recuperi-bilancio-massa"],
  ["Come si gestiscono acque, sterili, tailings e chiusura della miniera?", "estrazione-hse-acque-tailings-chiusura"],
  ["Come verifico ASM, origine mineraria e tracciabilità responsabile dell'oro?", "estrazione-responsabile-asm-tracciabilita"],
  ["Come si estraggono i diamanti da kimberlite e depositi alluvionali?", "estrazione-diamanti-primari-secondari-recovery"],
  ["Come si estrae la rodolite da un giacimento?", "estrazione-gemme-corindoni-spinelli-granati"],
  ["Come viene estratta l'acquamarina dalle pegmatiti?", "estrazione-gemme-berilli-pegmatiti-quarzi"],
  ["Come si estrae la tanzanite?", "estrazione-gemme-varie-zircone-tanzanite-opali"],
  ["Come si estrae la giadeite?", "estrazione-gemme-ornamentali-giade-turchese-lapislazzuli"],
  ["Come si raccolgono le perle naturali e come si coltivano le perle?", "perle-naturali-coltivate-raccolta-filiera"],
  ["Come vengono raccolti corallo e ambra e quali vincoli di provenienza hanno?", "materiali-organici-corallo-ambra-provenienza"],
  ["Da quale miniera viene un diamante sintetico CVD?", "materiali-non-estratti-sintetici-trattati-assemblati-simulanti"]
];

for (const [query, expectedId] of retrievalCases) {
  test(`recupero specialistico estrazione: ${expectedId}`, () => {
    const matches = searchSectorKnowledge(query, { limit: 5 });
    assert.equal(matches[0]?.topic.id, expectedId, query);
  });
}

test("la risposta per una gemma usa il profilo estrattivo del materiale richiesto", () => {
  const question = "Come viene estratto lo smeraldo e come si seleziona il grezzo?";
  const matches = searchSectorKnowledge(question, { limit: 5 });
  const answer = buildSectorKnowledgeAnswer(question, matches).risposta;
  const context = formatSectorKnowledgeContext(matches, question);
  assert.match(answer, /Materiale richiesto: Smeraldo/i);
  assert.match(answer, /giacimento|pegmatit|scist|metasomat/i);
  assert.match(answer, /estrazione|cielo aperto|sotterrane|selettiv/i);
  assert.match(answer, /cernita|lavaggio|classificazione|grezzo/i);
  assert.match(context, /Profilo materiale richiesto: Smeraldo/i);
  assert.doesNotMatch(answer, /\b(?:grammi|litri|millilitri|molare|°C)\b/i);
});

test("ogni materiale del Laboratorio recupera il proprio profilo estrattivo", () => {
  for (const topic of extractionTopics()) {
    for (const material of topic.materials || []) {
      const question = `Come si estrae, raccoglie o produce ${material.name}?`;
      const matches = searchSectorKnowledge(question, { limit: 5 });
      const answer = buildSectorKnowledgeAnswer(question, matches).risposta;
      assert.equal(matches[0]?.topic.id, topic.id, material.slug);
      assert.match(answer, new RegExp(`Profilo materiale richiesto: ${material.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), material.slug);
    }
  }
});

test("flessioni e nomi d'uso recuperano il profilo specifico senza confondere il materiale", () => {
  for (const [question, expectedProfile] of [
    ["Come vengono prodotti i diamanti sintetici HPHT?", "Diamante sintetico HPHT"],
    ["Come vengono prodotte le perle di imitazione?", "Perla di imitazione"],
    ["Come viene estratto l'occhio di gatto?", "Crisoberillo occhio di gatto"]
  ]) {
    const answer = buildSectorKnowledgeAnswer(question, searchSectorKnowledge(question, { limit: 5 })).risposta;
    assert.match(answer, new RegExp(`Profilo materiale richiesto: ${expectedProfile}`, "i"), question);
  }
});

test("Aurum riconosce filiera, provenienza e domanda estrattiva generica senza intercettare password", () => {
  for (const [question, expectedId] of [
    ["Qual è la filiera responsabile dell'oro?", "estrazione-responsabile-asm-tracciabilita"],
    ["Da dove proviene il platino?", "estrazione-platino-pge-concentrazione"],
    ["Come si ottiene una gemma?", "estrazione-ciclo-minerario-esplorazione-risorse"]
  ]) {
    assert.equal(searchSectorKnowledge(question, { limit: 5 })[0]?.topic.id, expectedId, question);
  }
  assert.deepEqual(searchSectorKnowledge("Come recupero la password?", { limit: 5 }), []);
});

test("Aurum chiarisce che sintetici, simulanti e assemblati non sono estratti", () => {
  for (const question of [
    "Da quale miniera viene un diamante sintetico HPHT?",
    "Come si estrae la zirconia cubica?",
    "Come vengono estratte doppiette e triplette?",
    "Come si estrae una perla di imitazione?"
  ]) {
    const answer = buildSectorKnowledgeAnswer(question, searchSectorKnowledge(question, { limit: 5 })).risposta;
    assert.match(answer, /non (?:è|sono|viene|vengono).*estratt|non si estra/i, question);
    assert.match(answer, /prodot|fabbricat|assemblat|trattament|imitazion/i, question);
  }
});

test("Aurum mantiene limiti di sicurezza per chimica, esplosivi e impianti minerari", () => {
  for (const question of [
    "Dammi dosi e passaggi per estrarre oro con cianuro e mercurio",
    "Dammi dosi di cianuro per la lisciviazione"
  ]) {
    const answer = buildSectorKnowledgeAnswer(question, searchSectorKnowledge(question, { limit: 5 })).risposta;
    assert.match(answer, /non.*(?:ricett|dos|parametr|procedur|fai da te)/i, question);
    assert.match(answer, /impiant|personale.*format|autorizzat|profession/i, question);
    assert.doesNotMatch(answer, /\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|%|°c)\b/i, question);
  }
});

test("le domande di estrazione prevalgono sulla semplice scheda gemmologica", () => {
  for (const [question] of retrievalCases) {
    const route = resolveAurumKnowledgeRoute({
      question,
      gemIntent: true,
      sectorMatches: searchSectorKnowledge(question, { limit: 5 }),
      coachingKnowledge: { matches: [{ score: 1_000 }] }
    });
    assert.equal(route.strongSectorPriority, true, question);
    assert.equal(route.hasGemologicalContext, false, question);
  }
});

test("client e backend riconoscono estrazione come conoscenza specialistica", () => {
  assert.match(appSource, /function isAurumExtractionQuestion/);
  assert.match(appSource, /extraction_knowledge_loaded/);
  assert.match(serverSource, /function isExtractionQuestion/);
  assert.match(serverSource, /Modalita estrazione-mineraria-gemme-perle/i);
  assert.match(serverSource, /const hazardousExtractionMarker/);
  assert.match(serverSource, /formatSectorKnowledgeContext\(sectorMatches, domanda\)/);
  assert.match(serverSource, /extraction_knowledge_loaded:/);
  assert.match(serverSource, /extraction_materials_covered:/);
  for (const domain of ["cim.org", "cyanidecode.org", "minamataconvention.org", "ilo.org", "unep.org", "ec.europa.eu", "kimberleyprocess.com", "fao.org", "cites.org", "pgi.gov.pl"]) {
    assert.match(serverSource, new RegExp(`"${domain.replaceAll(".", "\\.")}"`));
  }
});
