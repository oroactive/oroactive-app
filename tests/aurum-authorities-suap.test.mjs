import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AURUM_SECTOR_KNOWLEDGE,
  buildSectorKnowledgeAnswer,
  searchSectorKnowledge
} from "../services/aurum/sectorKnowledge.js";
import { resolveAurumKnowledgeRoute } from "../services/aurum/routing.js";

const [appSource, serverSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../server.js", import.meta.url), "utf8")
]);

const expectedTopicIds = [
  "autorita-controlli-compro-oro-mappa-competenze",
  "gdf-controlli-antiriciclaggio-compro-oro",
  "gdf-verifica-fiscale-tributaria-compro-oro",
  "questura-polizia-tulps-controlli-preziosi",
  "carabinieri-polizia-giudiziaria-provenienza-preziosi",
  "uif-nspv-sos-compro-oro",
  "accesso-ispezione-verbale-documenti-difesa",
  "suap-funzione-procedimento-compro-oro",
  "apertura-compro-oro-procedura-coordinata",
  "scia-condizionata-art127-no-silenzio-assenso",
  "sedi-preposti-variazioni-cessazione-compro-oro"
];

test("Aurum carica il nucleo specialistico autorità, controlli, SUAP e apertura", () => {
  assert.equal(AURUM_SECTOR_KNOWLEDGE.knowledgeVersion, "2026.08.03-autorita-suap-apertura");
  assert.equal(AURUM_SECTOR_KNOWLEDGE.verifiedAt, "3 agosto 2026");
  const topics = new Map(AURUM_SECTOR_KNOWLEDGE.topics.map((topic) => [topic.id, topic]));
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

const retrievalCases = [
  ["Quali autorità controllano un compro oro e come si dividono le competenze?", "autorita-controlli-compro-oro-mappa-competenze"],
  ["Cosa controlla la Guardia di Finanza per antiriciclaggio in un compro oro?", "gdf-controlli-antiriciclaggio-compro-oro"],
  ["Come si svolge una verifica fiscale e tributaria della Guardia di Finanza nel negozio?", "gdf-verifica-fiscale-tributaria-compro-oro"],
  ["Quali controlli fanno Polizia e Questura sulla licenza TULPS dei preziosi?", "questura-polizia-tulps-controlli-preziosi"],
  ["Qual è il ruolo dei Carabinieri se sospettano refurtiva o ricettazione di gioielli?", "carabinieri-polizia-giudiziaria-provenienza-preziosi"],
  ["A chi si invia una SOS e che ruolo hanno UIF e Nucleo Speciale Polizia Valutaria?", "uif-nspv-sos-compro-oro"],
  ["Cosa devo fare durante un accesso ispettivo e quali documenti e verbali devo conservare?", "accesso-ispezione-verbale-documenti-difesa"],
  ["Che funzione ha il SUAP per aprire un compro oro?", "suap-funzione-procedimento-compro-oro"],
  ["Qual è la procedura completa per aprire un negozio compro oro?", "apertura-compro-oro-procedura-coordinata"],
  ["Posso aprire con la sola SCIA o con il silenzio-assenso per la licenza preziosi?", "scia-condizionata-art127-no-silenzio-assenso"],
  ["Come comunico una nuova sede, un trasferimento o un nuovo preposto del compro oro?", "sedi-preposti-variazioni-cessazione-compro-oro"],
  ["Quali verifiche può fare la Polizia sui preziosi?", "questura-polizia-tulps-controlli-preziosi"],
  ["Come apro un negozio che compra oro usato?", "apertura-compro-oro-procedura-coordinata"],
  ["Posso iniziare dopo aver inviato la SCIA?", "scia-condizionata-art127-no-silenzio-assenso"]
];

for (const [query, expectedId] of retrievalCases) {
  test(`recupero specialistico autorità/SUAP: ${expectedId}`, () => {
    const matches = searchSectorKnowledge(query, { limit: 5 });
    assert.equal(matches[0]?.topic.id, expectedId, query);
  });
}

test("Aurum distingue le competenze senza attribuire a tutte le Forze gli stessi poteri", () => {
  const answer = buildSectorKnowledgeAnswer(
    retrievalCases[0][0],
    searchSectorKnowledge(retrievalCases[0][0], { limit: 5 })
  ).risposta;
  assert.match(answer, /Guardia di Finanza|GdF/i);
  assert.match(answer, /Questore|Questura/i);
  assert.match(answer, /Carabinieri|polizia giudiziaria/i);
  assert.match(answer, /MEF|OAM|UIF/i);
  assert.match(answer, /distint|non.*stessi poteri|competenze diverse/i);
});

test("Aurum insegna che la sola SCIA e il decorso del tempo non consentono l'avvio", () => {
  const answer = buildSectorKnowledgeAnswer(
    retrievalCases[9][0],
    searchSectorKnowledge(retrievalCases[9][0], { limit: 5 })
  ).risposta;
  assert.match(answer, /Legge 2 dicembre 2025|L\. 2 dicembre 2025|182\/2025/i);
  assert.match(answer, /SCIA condizionata/i);
  assert.match(answer, /non.*silenzio-assenso|silenzio-assenso.*non/i);
  assert.match(answer, /autorizzazione espressa.*Questore|Questore.*autorizzazione espressa/i);
  assert.match(answer, /non (?:pu[oò]|deve) iniziare|attivit[aà].*non.*iniziare/i);
});

test("Aurum presenta l'apertura come sequenza SUAP, Questura, OAM e readiness operativa", () => {
  const answer = buildSectorKnowledgeAnswer(
    retrievalCases[8][0],
    searchSectorKnowledge(retrievalCases[8][0], { limit: 5 })
  ).risposta;
  const suap = answer.search(/SUAP/i);
  const questura = answer.search(/Questur/i);
  const oam = answer.search(/OAM/i);
  assert.ok(suap >= 0 && questura > suap && oam > questura, answer);
  assert.match(answer, /conto.*dedicat|bilancia.*legal|schede|fotografie/i);
  assert.match(answer, /tutti.*titoli|tre titoli|solo dopo/i);
});

test("Aurum gestisce l'ispezione senza suggerire ostacolo, alterazione o divulgazione della SOS", () => {
  const inspection = buildSectorKnowledgeAnswer(
    retrievalCases[6][0],
    searchSectorKnowledge(retrievalCases[6][0], { limit: 5 })
  ).risposta;
  assert.match(inspection, /cooper|identificazion.*operant|tipo di controllo/i);
  assert.match(inspection, /non (?:cancellare|alterare|modificare|ricostruire)/i);
  assert.match(inspection, /verbale|copia/i);
  assert.match(inspection, /professionista|commercialista|legale/i);

  const sos = buildSectorKnowledgeAnswer(
    retrievalCases[5][0],
    searchSectorKnowledge(retrievalCases[5][0], { limit: 5 })
  ).risposta;
  assert.match(sos, /UIF/i);
  assert.match(sos, /riservat|non.*informare.*cliente/i);
  assert.match(sos, /1.? luglio 2026|primo luglio 2026/i);
});

test("le domande su autorità, SUAP e apertura hanno sempre priorità settoriale", () => {
  retrievalCases.forEach(([question]) => {
    const route = resolveAurumKnowledgeRoute({
      question,
      sectorMatches: searchSectorKnowledge(question, { limit: 5 }),
      coachingKnowledge: { matches: [{ score: 1000 }] }
    });
    assert.equal(route.strongSectorPriority, true, question);
  });
});

test("client e backend instradano autorità e SUAP come normativa specialistica", () => {
  assert.match(appSource, /function isAurumAuthoritiesSuapOpeningQuestion/);
  assert.match(appSource, /const authoritiesSuapQuestion = isAurumAuthoritiesSuapOpeningQuestion\(question\)/);
  assert.match(appSource, /authorities_suap_knowledge_loaded/);
  assert.match(serverSource, /function isAuthoritiesSuapOpeningQuestion/);
  assert.match(serverSource, /const authoritiesSuapQuestion = isAuthoritiesSuapOpeningQuestion\(domanda\)/);
  assert.match(serverSource, /Modalita autorita-controlli-SUAP-apertura/i);
  assert.match(serverSource, /authorities_suap_knowledge_loaded:/);
  for (const domain of ["gdf.gov.it", "carabinieri.it", "impresainungiorno.gov.it", "registroimprese.it"]) {
    assert.match(serverSource, new RegExp(`"${domain.replaceAll(".", "\\.")}"`));
  }
});

test("il fallback distingue apertura, controlli art. 127 e variazioni del preposto", () => {
  const openingDeclaration = appSource.match(/const asksOpening = ([^;]+);/)?.[1] || "";
  assert.doesNotMatch(openingDeclaration, /articolo 127|art 127|prepost/);
  assert.match(appSource, /const asksPoliceTulps = [\s\S]*?articolo 127[\s\S]*?sospend/);
  assert.match(appSource, /const asksLocations = [^;]*prepost/);
  assert.match(appSource, /Per nuova sede, trasferimento, preposto o cessazione/);
});
