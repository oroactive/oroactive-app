import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const file = (name) => readFile(path.join(root, name), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Funzione ${name} non trovata`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Funzione ${name} incompleta`);
}

test("Aurum avvia il tutorial Utenti solo su richiesta esplicita", async () => {
  const app = await file("app.js");
  const names = [
    "aurumNormalize",
    "isAurumUsersTopic",
    "isAurumExplicitTutorialRequest",
    "isAurumExplicitUsersTutorialRequest",
    "isAurumUsersConfusionRequest",
    "classifyAurumTutorialConfirmation",
    "inferAurumTutorialId"
  ];
  const source = names.map((name) => extractFunction(app, name)).join("\n");
  const api = new Function(
    "aurumSectionKey",
    `${source}; return {
      isAurumUsersConfusionRequest,
      classifyAurumTutorialConfirmation,
      inferAurumTutorialId
    };`
  )(() => "menu");

  for (const question of [
    "utente founder",
    "2utente founder",
    "quanti utenti founder ci sono?",
    "quali permessi ha un utente founder?",
    "come creo un utente founder?",
    "fammi un utente founder",
    "mostrami gli utenti online",
    "non avviare il tutorial utenti",
    "senza avviare il tutorial utenti spiegami i ruoli",
    "non voglio il tutorial utenti",
    "il tutorial utenti è sbagliato",
    "puoi dirmi cos'è il tutorial utenti?",
    "vorrei informazioni sul tutorial utenti"
  ]) {
    assert.equal(api.inferAurumTutorialId(question), "", question);
  }

  for (const question of [
    "Avvia il tutorial utenti",
    "Fammi il tutorial sulla sezione utenti",
    "Guidami passo passo nella gestione utenti",
    "Spiegami passo passo la gestione utenti",
    "Fammi la guida utenti"
  ]) {
    assert.equal(api.inferAurumTutorialId(question), "tutorial_utenti", question);
  }

  for (const question of [
    "Non capisco la sezione utenti",
    "Non ho compreso come gestire gli utenti",
    "Non mi è chiara la gestione utenti"
  ]) {
    assert.equal(api.isAurumUsersConfusionRequest(question, "menu"), true, question);
    assert.equal(api.inferAurumTutorialId(question), "", question);
  }

  assert.equal(api.classifyAurumTutorialConfirmation("Sì, procedi"), "accept");
  assert.equal(api.classifyAurumTutorialConfirmation("Sì, voglio il tutorial"), "accept");
  assert.equal(api.classifyAurumTutorialConfirmation("Sì, per favore"), "accept");
  assert.equal(api.classifyAurumTutorialConfirmation("Sì, va bene"), "accept");
  assert.equal(api.classifyAurumTutorialConfirmation("Sì certo"), "accept");
  assert.equal(api.classifyAurumTutorialConfirmation("Ok, fallo"), "accept");
  assert.equal(api.classifyAurumTutorialConfirmation("No, non ora"), "decline");
  assert.equal(api.classifyAurumTutorialConfirmation("No, preferisco di no"), "decline");
  assert.equal(api.classifyAurumTutorialConfirmation("Che permessi ha il founder?"), "");
  assert.equal(api.isAurumUsersConfusionRequest("Non capisco il backup", "utenti"), false);
  assert.equal(api.isAurumUsersConfusionRequest("Non capisco come creare un nuovo negozio", "utenti"), false);
  assert.equal(api.isAurumUsersConfusionRequest("Non capisco le notifiche", "utenti"), false);
  assert.equal(api.isAurumUsersConfusionRequest("Non capisco i permessi del browser", "utenti"), false);
  assert.equal(api.isAurumUsersConfusionRequest("Non capisco questa sezione", "utenti"), true);

  const handlerStart = app.indexOf("function handleAurumTutorRequest");
  const handlerEnd = app.indexOf("function stopAurumTips", handlerStart);
  const handler = app.slice(handlerStart, handlerEnd);
  assert.match(handler, /state\.aurumPendingTutorialId/);
  assert.match(handler, /Vuoi che avvii il tutorial guidato/);
  assert.match(handler, /classifyAurumTutorialConfirmation/);
});

test("Aurum non avvia il tutorial Fusioni per una domanda specialistica", async () => {
  const app = await file("app.js");
  const names = [
    "aurumNormalize",
    "isAurumUsersTopic",
    "isAurumExplicitTutorialRequest",
    "isAurumExplicitUsersTutorialRequest",
    "isAurumFoundryQuestion",
    "inferAurumTutorialId"
  ];
  const source = names.map((name) => extractFunction(app, name)).join("\n");
  const api = new Function(
    "aurumSectionKey",
    `${source}; return { inferAurumTutorialId, isAurumFoundryQuestion };`
  )(() => "menu");

  for (const question of [
    "Come funziona la fusione dell'oro?",
    "Quale margine trattiene la fonderia?",
    "Quali raffinerie fondono oro in Lombardia?",
    "Come paga una fonderia il compro oro?",
    "Quali materiali separano oro e rame in una lega?"
  ]) {
    assert.equal(api.inferAurumTutorialId(question), "", question);
    assert.equal(api.isAurumFoundryQuestion(question), true, question);
  }
  for (const question of [
    "Avvia il tutorial fusioni",
    "Guidami passo passo nella sezione fusioni",
    "Fammi la guida del lotto fusione"
  ]) {
    assert.equal(api.inferAurumTutorialId(question), "tutorial_fusioni", question);
    assert.equal(api.isAurumFoundryQuestion(question), false, question);
  }
});

test("Aurum non scambia la formazione geologica per il tutorial Academy", async () => {
  const app = await file("app.js");
  const names = [
    "aurumNormalize",
    "isAurumUsersTopic",
    "isAurumGeologyOrNumismaticsQuestion",
    "isAurumExplicitTutorialRequest",
    "isAurumExplicitUsersTutorialRequest",
    "inferAurumTutorialId"
  ];
  const source = names.map((name) => extractFunction(app, name)).join("\n");
  const api = new Function(
    "aurumSectionKey",
    `${source}; return { inferAurumTutorialId, isAurumGeologyOrNumismaticsQuestion };`
  )(() => "menu");

  for (const question of [
    "Come avviene la formazione geologica dell'oro?",
    "Come si forma un diamante nel mantello?",
    "Raccontami la storia della Sterlina d'oro",
    "Quali sono peso e titolo del Krugerrand?"
  ]) {
    assert.equal(api.isAurumGeologyOrNumismaticsQuestion(question), true, question);
    assert.equal(api.inferAurumTutorialId(question), "", question);
  }
  assert.equal(api.inferAurumTutorialId("Avvia il tutorial Academy"), "tutorial_academy");
});

test("Negozi usa eliminazione logica, conferma e layout dedicato", async () => {
  const [app, server, schema, migration, index, styles] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260730_store_soft_delete.sql"),
    file("index.html"),
    file("styles.css")
  ]);

  assert.match(schema, /ALTER TABLE negozi ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ/);
  assert.match(schema, /ALTER TABLE negozi ADD COLUMN IF NOT EXISTS deleted_by BIGINT/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS negozi_deleted_at_idx/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION oroactive_require_active_store/);
  assert.match(schema, /FOR KEY SHARE/);
  assert.match(schema, /TG_TABLE_NAME = 'utenti'[\s\S]*to_jsonb\(NEW\)->>'attivo'/);
  assert.match(schema, /BEFORE INSERT OR UPDATE OF negozio_id, attivo ON utenti/);
  for (const trigger of [
    "utenti_active_store_guard",
    "atti_vendita_active_store_guard",
    "fusion_lots_active_store_guard",
    "approval_requests_active_store_guard"
  ]) {
    assert.match(schema, new RegExp(`CREATE TRIGGER ${trigger}`));
    assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
  }
  assert.match(server, /async function deleteStore/);
  assert.match(server, /UPDATE negozi[\s\S]*deleted_at = NOW\(\)[\s\S]*deleted_by = \$2::bigint/);
  assert.doesNotMatch(server, /DELETE FROM negozi/);
  assert.match(server, /utenti attivi assegnati/);
  assert.match(server, /pratiche operative ancora aperte/);
  assert.match(server, /error\.status = 409/);
  assert.match(server, /LOCK TABLE negozi IN SHARE ROW EXCLUSIVE MODE/);
  assert.match(server, /LOCK TABLE utenti, atti_vendita, approval_requests, fusion_lots IN SHARE MODE/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /lotti di fusione ancora aperti/);
  assert.match(server, /a\.negozio_id IS NULL AND \(a\.store = \$2::text OR a\.store_code = \$3::text\)/);
  assert.match(server, /app\.delete\("\/api\/negozi\/:id", requireFounder/);
  assert.match(server, /action: "store_deleted"/);
  assert.match(server, /deleted_at IS NULL/);
  assert.match(server, /oroactive_active_store_required/);
  assert.match(server, /activeStoreConflict \? 409 : 500/);

  assert.match(app, /data-delete-store/);
  assert.match(app, /async function deleteStore/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /window\.confirm/);
  assert.match(index, /class="archive-table stores-table" id="storesList"/);
  assert.match(styles, /\.stores-table \.table-row/);
  assert.match(styles, /grid-template-columns:[^;]*minmax\(240px, 1\.35fr\)/);
  assert.match(app, /\[\.\.\.storeCodeSelect\.options\]\.some/);
  const askStart = app.indexOf("async function askAurum");
  const askEnd = app.indexOf("function sendAssistantFeedback", askStart);
  const askBlock = app.slice(askStart, askEnd);
  assert.match(askBlock, /requiresBackendSafety[\s\S]*state\.aurumPendingTutorialId = ""/);
  assert.ok(
    askBlock.indexOf("if (!requiresBackendSafety && state.aurumPendingTutorialId)") < askBlock.indexOf("if (!requiresBackendSafety && state.aurumActiveQuiz)"),
    "La conferma tutorial pendente deve essere gestita prima di quiz, mood e domande normative."
  );
});
