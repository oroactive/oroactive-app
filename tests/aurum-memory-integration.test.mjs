import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import "../shared/aurum-policy.js";

const [appSource, serverSource, schemaSource, indexSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../server.js", import.meta.url), "utf8"),
  readFile(new URL("../schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8")
]);

test("il client non registra automaticamente domande, quiz, feedback o supporto", () => {
  assert.doesNotMatch(appSource, /recordAurumInteractionMemory\(/);
  assert.doesNotMatch(appSource, /automatic:\s*true/);
  assert.match(appSource, /explicit_consent:\s*true/);
});

test("l'utente dispone di visualizzazione, modifica, export ed eliminazione completa", () => {
  assert.match(indexSource, /id="aurumMyMemoriesList"/);
  assert.match(indexSource, /id="aurumExportMemories"/);
  assert.match(indexSource, /id="aurumDeleteAllMemories"/);
  assert.match(appSource, /data-edit-aurum-memory/);
  assert.match(appSource, /\/aurum\/memories\/export/);
  assert.match(appSource, /method:\s*"PATCH"/);
});

test("il backend richiede consenso, isola l'utente e non espone contenuti al Founder", () => {
  assert.match(serverSource, /explicit_consent/);
  assert.match(serverSource, /listAllAurumMemorySummaries/);
  assert.doesNotMatch(serverSource, /SELECT m\.id, m\.user_id, m\.memory_text[\s\S]{0,400}?LEFT JOIN utenti/);
  assert.match(serverSource, /WHERE user_id = \$1::bigint/);
  assert.match(serverSource, /app\.patch\("\/api\/aurum\/memories\/:id"/);
  assert.match(serverSource, /app\.get\("\/api\/aurum\/memories\/export"/);
  assert.match(serverSource, /app\.delete\("\/api\/aurum\/memories"/);
  assert.match(serverSource, /DELETE FROM aurum_user_memories[\s\S]{0,160}?WHERE id = \$1::uuid/);
  assert.match(serverSource, /DELETE FROM aurum_user_memories[\s\S]{0,160}?WHERE user_id = \$1::bigint/);
});

test("lo schema conserva cifratura, consenso e condivisione separata con l'AI", () => {
  assert.match(schemaSource, /memory_value_encrypted TEXT/);
  assert.match(schemaSource, /consent_version TEXT/);
  assert.match(schemaSource, /share_with_ai BOOLEAN DEFAULT FALSE/);
  assert.match(schemaSource, /use_in_chat BOOLEAN DEFAULT FALSE/);
  assert.match(schemaSource, /memory_key TEXT/);
});

test("continuità conversazionale e coaching entrano nella pipeline Aurum", () => {
  assert.match(appSource, /conversationHistory:/);
  assert.match(serverSource, /searchCoachingKnowledge\(domanda/);
  assert.match(serverSource, /classifyCoachingSafety\(domanda/);
  assert.match(serverSource, /CONTESTO COACHING AURUM:/);
  assert.match(serverSource, /MEMORIA PERSONALE CONSENTITA:/);
  assert.doesNotMatch(serverSource, /question_preview:/);
});

test("logout e nuova autenticazione azzerano sincronicamente ogni dato Aurum del precedente operatore", () => {
  const resetBlock = appSource.match(/function resetAurumSessionState\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(resetBlock);
  for (const stateKey of [
    "aurumMessages",
    "aurumMemories",
    "aurumAllMemories",
    "aurumSupportRequests",
    "aurumConsentCandidate",
    "aurumLastUserMessage",
    "aurumPriceContext"
  ]) {
    assert.match(resetBlock, new RegExp(`state\\.${stateKey}\\s*=`), stateKey);
  }
  assert.match(resetBlock, /aurumChatPanel\.hidden = true/);
  assert.match(appSource, /function showLogin[\s\S]{0,180}?resetAurumSessionState\(\);[\s\S]{0,80}?state\.currentUser = null/);
  assert.ok((appSource.match(/resetAurumSessionState\(\);\n\s*state\.currentUser = normalizeAuthenticatedUserPayload/g) || []).length >= 3);
});

test("la risposta locale all'umore è monouso e non intercetta crisi o domande operative", () => {
  const source = appSource
    .match(/function classifyAurumMood[\s\S]*?\n\}\n\nfunction handleAurumMoodReply[\s\S]*?\n\}\n\nfunction detectAurumMemoryCandidate/)?.[0]
    ?.replace(/\n\nfunction detectAurumMemoryCandidate$/, "") || "";
  assert.ok(source);
  const state = { aurumAskedMoodToday: true, aurumMessages: [] };
  const safetySource = appSource
    .match(/function requiresAurumBackendSafety[\s\S]*?\n\}/)?.[0] || "";
  const requiresSafety = Function(`${safetySource}; return requiresAurumBackendSafety;`)();
  const handle = Function(
    "state",
    "aurumSupportActions",
    "renderAurumMessageRecipients",
    "requiresAurumBackendSafety",
    `${source}; return handleAurumMoodReply;`
  )(state, null, () => {}, requiresSafety);

  assert.equal(handle("Non sto bene, penso di buttarmi dal ponte"), false);
  assert.equal(state.aurumAskedMoodToday, false);
  assert.equal(state.aurumMessages.length, 0);

  state.aurumAskedMoodToday = true;
  assert.equal(handle("Va bene, come calcolo l'oro?"), false);
  assert.equal(state.aurumMessages.length, 0);

  state.aurumAskedMoodToday = true;
  assert.equal(handle("Sto bene"), true);
  assert.equal(state.aurumMessages.length, 1);

  state.aurumAskedMoodToday = false;
  assert.equal(handle("Bene"), false);
});

test("la sicurezza backend prevale sempre su quiz, umore e tutorial locali", () => {
  const safetySource = appSource
    .match(/function requiresAurumBackendSafety[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(safetySource);
  const requiresSafety = Function(`${safetySource}; return requiresAurumBackendSafety;`)();
  for (const value of [
    ...globalThis.OroActiveAurumPolicy.safetyCases.crisis,
    ...globalThis.OroActiveAurumPolicy.safetyCases.mentalHealthBoundary
  ]) {
    assert.equal(requiresSafety(value), true, value);
  }
  assert.equal(requiresSafety("Va bene, come calcolo l'oro?"), false);

  const askBlock = appSource.match(/async function askAurum\(event\) \{[\s\S]*?\n\}\n\nfunction renderKnowledgeStatus/)?.[0] || "";
  assert.ok(askBlock);
  assert.match(askBlock, /const requiresBackendSafety = requiresAurumBackendSafety\(question\)/);
  assert.match(askBlock, /if \(requiresBackendSafety\) \{[\s\S]*?state\.aurumActiveQuiz = null/);
  assert.match(askBlock, /if \(!requiresBackendSafety && state\.aurumActiveQuiz\)/);
  assert.match(askBlock, /!requiresBackendSafety && handleAurumMoodReply\(question\)/);
  assert.match(askBlock, /!requiresBackendSafety && !normativeQuestion && handleAurumTutorRequest\(question\)/);
});

test("il client non propone il salvataggio di salute, crisi o categorie particolari", () => {
  const source = appSource
    .match(/function containsAurumForbiddenMemoryData[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(source);
  const isForbidden = Function(`${source}; return containsAurumForbiddenMemoryData;`)();
  for (const value of [
    ...globalThis.OroActiveAurumPolicy.forbiddenMemoryCases,
    "Ricorda che ho la leucemia",
    "Ricorda che sono in dialisi",
    "Ricorda che ho pensieri suicidi",
    "Ricorda che sono dipendente dal gioco",
    "Ricorda che sono musulmano",
    "Ricorda che sono gay",
    "Ricorda che ho precedenti penali",
    "Ricorda che sono cieco",
    "Ricorda che ho una polmonite",
    "Ricorda che ho una protesi",
    "Ricorda che sono stato condannato"
  ]) {
    assert.equal(isForbidden(value), true, value);
  }
  assert.equal(isForbidden("Ricorda che preferisco domande brevi"), false);
  assert.match(appSource, /function detectAurumMemoryCandidate[\s\S]{0,260}?containsAurumForbiddenMemoryData\(text\)/);
});

test("l'audit Aurum non registra inferenze cliniche o profili coaching individuali", () => {
  const endpoint = serverSource.match(/app\.post\("\/api\/ai\/assistente"[\s\S]*?\n\}\);/)?.[0] || "";
  assert.ok(endpoint);
  assert.doesNotMatch(endpoint, /safety_level\s*:/);
  assert.doesNotMatch(endpoint, /coaching_topic\s*:/);
  assert.doesNotMatch(endpoint, /question_preview\s*:/);
});
