import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(testDir, "../services/aurum/saleDeedKnowledge.js");

async function loadModule() {
  try {
    return await import(pathToFileURL(modulePath));
  } catch (error) {
    if (!/Unexpected token 'export'|Unexpected token 'const'|Cannot use import statement/.test(String(error))) throw error;
    const source = await readFile(modulePath, "utf8");
    return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  }
}

const knowledge = await loadModule();
const {
  SALE_DEED_FIELD_KNOWLEDGE,
  AURUM_SALE_DEED_STATS,
  findSaleDeedFieldById,
  searchSaleDeedKnowledge,
  selectSaleDeedKnowledgeMatches,
  formatSaleDeedKnowledgeContext,
  buildSaleDeedKnowledgeAnswer,
  saleDeedKnowledgeSources
} = knowledge;

// Ogni voce deve restare ricercabile, spiegabile e collegata alla propria fonte.
test("espone un registry completo di 48 campi validi e univoci", () => {
  assert.equal(SALE_DEED_FIELD_KNOWLEDGE.length, 48);
  assert.equal(new Set(SALE_DEED_FIELD_KNOWLEDGE.map((field) => field.id)).size, 48);
  for (const field of SALE_DEED_FIELD_KNOWLEDGE) {
    assert.ok(field.label);
    assert.ok(field.category);
    assert.ok(field.payloadPaths.length);
    assert.ok(field.aliases.length);
    assert.ok(field.purpose);
    assert.ok(field.completion);
    assert.ok(field.requirement.legal);
    assert.ok(field.requirement.oroActive);
    assert.ok(field.requirement.condition);
    assert.ok(field.controls.length);
    assert.ok(field.privacy.classification);
    assert.ok(field.privacy.handling);
    assert.ok(field.commonErrors.length);
    assert.ok(field.nature.length);
    assert.ok(field.sources.length);
  }
});

test("ogni affermazione di obbligo legale rinvia a una fonte ufficiale HTTPS", () => {
  for (const field of SALE_DEED_FIELD_KNOWLEDGE.filter((entry) => entry.nature.includes("obbligo_legale"))) {
    const sources = saleDeedKnowledgeSources([field]);
    assert.ok(
      sources.some((source) => source.authority !== "OroActive" && source.url?.startsWith("https://")),
      field.id
    );
  }
});

test("dichiara esattamente i tre gap prioritari richiesti", () => {
  const gaps = SALE_DEED_FIELD_KNOWLEDGE.filter((field) => !field.implemented).map((field) => field.id).sort();
  assert.deepEqual(gaps, ["account_holder", "subsequent_destination", "valuation_quote"]);
  assert.equal(AURUM_SALE_DEED_STATS.totalFields, 48);
  assert.equal(AURUM_SALE_DEED_STATS.implementedFields, 45);
  assert.equal(AURUM_SALE_DEED_STATS.knownGaps, 3);
});

test("recupera alias e percorsi in modo deterministico", () => {
  SALE_DEED_FIELD_KNOWLEDGE.forEach((field) => {
    assert.equal(searchSaleDeedKnowledge(field.id)[0]?.field.id, field.id, field.id);
  });
  assert.equal(searchSaleDeedKnowledge("IBAN")[0].field.id, "iban");
  assert.equal(searchSaleDeedKnowledge("intestatario conto")[0].field.id, "account_holder");
  assert.equal(searchSaleDeedKnowledge("due fotografie da prospettive diverse")[0].field.id, "precious_photos");
  assert.equal(searchSaleDeedKnowledge("items description")[0].field.id, "item_description");
  const first = searchSaleDeedKnowledge("scadenza documento").map(({ field, score }) => [field.id, score]);
  const second = searchSaleDeedKnowledge("scadenza documento").map(({ field, score }) => [field.id, score]);
  assert.deepEqual(first, second);
});

test("l'id richiesto è esatto e gli identificatori legacy non contaminano altri campi", () => {
  assert.equal(findSaleDeedFieldById("signatures")?.id, "signatures");
  assert.equal(findSaleDeedFieldById("firma_cliente"), null);
  assert.equal(searchSaleDeedKnowledge("firma_cliente")[0]?.field.id, "signatures");
  assert.deepEqual(
    selectSaleDeedKnowledgeMatches(searchSaleDeedKnowledge("IBAN")).map(({ field }) => field.id),
    ["iban"]
  );
  assert.deepEqual(buildSaleDeedKnowledgeAnswer("IBAN").fields, ["iban"]);
});

test("Aurum distingue i controlli necessari dai controlli formali già presenti", () => {
  assert.match(buildSaleDeedKnowledgeAnswer("IBAN").risposta, /controlla oggi solo il formato/i);
  assert.match(buildSaleDeedKnowledgeAnswer("codice fiscale").risposta, /controlla oggi solo lunghezza e caratteri/i);
});

test("il contesto include compilazione, obbligatorietà, privacy, errori e fonti", () => {
  const context = formatSaleDeedKnowledgeContext("bonifico", { limit: 2 });
  assert.match(context, /Come compilare|Compilazione:/);
  assert.match(context, /Obbligatorietà legale:/);
  assert.match(context, /Procedura OroActive:/);
  assert.match(context, /Privacy:/);
  assert.match(context, /Errori:/);
  assert.match(context, /Fonti:/);
});

test("la risposta professionale segnala i gap e non inventa valori del cliente", () => {
  const answer = buildSaleDeedKnowledgeAnswer("Dove inserisco la quotazione applicata?");
  assert.equal(answer.fields[0], "valuation_quote");
  assert.match(answer.risposta, /gap noto, da implementare/i);
  assert.match(answer.risposta, /Fonti verificate il 2026-07-30/);
  assert.doesNotMatch(answer.risposta, /Mario Rossi|IT60X0542811101000000123456/);
  assert.ok(answer.sources.some((source) => source.id === "dlgs92"));
});

test("la risposta vuota invita a specificare il campo e protegge i dati personali", () => {
  const answer = buildSaleDeedKnowledgeAnswer("?");
  assert.deepEqual(answer.fields, []);
  assert.deepEqual(answer.sources, []);
  assert.match(answer.risposta, /Non ho individuato un campo preciso/);
  assert.match(answer.risposta, /Non inserire.*dati personali reali/i);
});

test("le fonti restituite sono deduplicate e risolvibili", () => {
  const sources = saleDeedKnowledgeSources([
    SALE_DEED_FIELD_KNOWLEDGE.find((field) => field.id === "fiscal_code"),
    SALE_DEED_FIELD_KNOWLEDGE.find((field) => field.id === "identity_attachments")
  ]);
  assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  assert.ok(sources.every((source) => source.title && source.authority && source.verifiedAt));
  assert.ok(sources.every((source) => source.url || source.path));
});
