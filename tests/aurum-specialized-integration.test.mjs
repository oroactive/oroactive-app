import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SALE_DEED_FIELD_KNOWLEDGE } from "../services/aurum/saleDeedKnowledge.js";
import { sanitizeAssistantContextObject } from "../services/aurum/privacy.js";

const [appSource, serverSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../server.js", import.meta.url), "utf8")
]);

test("il client espone esattamente gli stessi 48 campi della guida professionale", () => {
  const start = appSource.indexOf("const AURUM_SALE_DEED_FIELD_HELP");
  const end = appSource.indexOf("AURUM_SALE_DEED_FIELD_HELP.forEach", start);
  assert.ok(start >= 0 && end > start);
  const ids = [...appSource.slice(start, end).matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(new Set(ids), new Set(SALE_DEED_FIELD_KNOWLEDGE.map((field) => field.id)));
  assert.equal(ids.length, 48);
  for (const id of ["fiscal_code", "document_type", "residence_address", "item_description", "payment_method", "signatures"]) {
    assert.ok(appSource.includes(`selector: '[data-aurum-help="${id}"]'`), id);
  }
});

test("la richiesta del campo passa al backend senza valori personali", () => {
  assert.match(appSource, /requestedFieldId:\s*state\.aurumRequestedFieldKey\s*\|\|\s*""/);
  assert.match(appSource, /state\.aurumRequestedFieldKey\s*=\s*fieldKey/);
  assert.match(appSource, /if\s*\(fieldKey\s*&&\s*AURUM_SALE_DEED_FIELD_IDS\.has\(fieldKey\)\)\s*\{[\s\S]{0,500}?return false;/);
  assert.match(appSource, /firma_cliente:\s*"signatures"/);
  assert.match(appSource, /AURUM_SALE_DEED_FIELD_IDS\.has\(fieldKey\)/);

  const safe = sanitizeAssistantContextObject({
    requestedFieldId: "iban",
    currentSection: "nuovo_atto_vendita",
    iban: "IT60X0542811101000000123456",
    userName: "Mario Rossi",
    fiscalCode: "RSSMRA80A01H501U"
  });
  assert.deepEqual(safe, {
    requestedFieldId: "iban",
    currentSection: "nuovo_atto_vendita"
  });
});

test("il backend mantiene separate guida atto, laboratorio e conoscenza settoriale", () => {
  assert.match(serverSource, /searchGemologicalKnowledge\(domanda/);
  assert.match(serverSource, /hasGemologicalKnowledgeIntent\(gemKnowledge\)/);
  assert.match(serverSource, /findSaleDeedFieldById\(requestedFieldCandidate\)/);
  assert.match(serverSource, /requestedSaleField[\s\S]{0,200}?score:\s*10_000/);
  assert.match(serverSource, /resolveAurumKnowledgeRoute\(\{/);
  assert.match(serverSource, /hasGemologicalContext\s*\|\|\s*hasSaleDeedContext\s*\|\|\s*hasCoachingContext\s*\?\s*\[\]/);
  assert.match(serverSource, /LABORATORIO GEMMOLOGICO OROACTIVE:/);
  assert.match(serverSource, /GUIDA PROFESSIONALE ATTO DI VENDITA:/);
  assert.match(serverSource, /non mescolare proprietà di schede diverse/i);
  assert.match(serverSource, /distingui obbligo legale, procedura OroActive e campo mancante/i);
});

test("lo stato AI pubblica copertura e gap verificabili", () => {
  assert.match(serverSource, /accounting_knowledge_loaded:/);
  assert.match(serverSource, /accounting_topics:/);
  assert.match(serverSource, /accounting_knowledge_verified_at:/);
  assert.match(serverSource, /professional_gold_knowledge_loaded:/);
  assert.match(serverSource, /professional_gold_topics:/);
  assert.match(serverSource, /bullion_private_knowledge_loaded:/);
  assert.match(serverSource, /bullion_private_topics:/);
  assert.match(serverSource, /gemological_knowledge_loaded:/);
  assert.match(serverSource, /gemological_materials:/);
  assert.match(serverSource, /gemological_tools:/);
  assert.match(serverSource, /sale_deed_knowledge_loaded:/);
  assert.match(serverSource, /sale_deed_fields_implemented:/);
  assert.match(serverSource, /sale_deed_known_gaps:/);
});

test("le domande contabili usano la base specialistica e non il fallback legale generico", () => {
  assert.match(appSource, /function isAurumFiscalAccountingQuestion/);
  assert.match(appSource, /normativeQuestion && !accountingQuestion && !professionalGoldQuestion && !isAurumNormativeAnswerAdequate/);
  assert.match(serverSource, /function isComproOroAccountingQuestion/);
  assert.match(serverSource, /Modalita contabile-fiscale/);
  assert.match(serverSource, /Non assegnare una scrittura o un regime definitivo/);
  assert.match(serverSource, /"agenziaentrate\.gov\.it"/);
  assert.match(serverSource, /"fondazioneoic\.eu"/);
});

test("le domande OPO, Banca d’Italia, lingotti e privati usano il percorso specialistico", () => {
  assert.match(appSource, /function isAurumProfessionalGoldQuestion/);
  assert.match(appSource, /const professionalGoldQuestion = isAurumProfessionalGoldQuestion\(question\)/);
  assert.match(appSource, /!professionalGoldQuestion && !isAurumNormativeAnswerAdequate/);
  assert.match(serverSource, /function isProfessionalGoldQuestion/);
  assert.match(serverSource, /Modalita OPO-lingotti/);
  assert.match(serverSource, /non presentare Banca d.Italia come gestore attuale del Registro OPO/i);
  assert.match(serverSource, /"organismo-am\.it"/);
  assert.match(serverSource, /"uif\.bancaditalia\.it"/);
});
