import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeAurumConversationSafety,
  buildAurumCrisisFollowUpResponse,
  hasStrongCrisisResolution
} from "../services/aurum/conversationSafety.js";

test("un messaggio neutro dopo una crisi riceve ancora un check-in locale", () => {
  const analysis = analyzeAurumConversationSafety([
    { role: "user", content: "Voglio morire" },
    { role: "assistant", content: "Contatta subito i servizi di emergenza locali." },
    { role: "user", content: "Sono ancora qui" }
  ], "Sono ancora qui");
  assert.equal(analysis.recentCrisis, true);
  assert.equal(analysis.needsCrisisFollowUp, true);
  assert.equal(analysis.hasSensitiveHistory, true);
  assert.match(buildAurumCrisisFollowUpResponse(analysis), /al sicuro|persona reale|emergenza/i);
});

test("dire soltanto di essere al sicuro non chiude prudentemente il check-in", () => {
  const analysis = analyzeAurumConversationSafety([
    { role: "user", content: "Voglio farla finita" },
    { role: "assistant", content: "Raggiungi una persona fidata." },
    { role: "user", content: "Ora sono al sicuro" }
  ], "Ora sono al sicuro");
  assert.equal(hasStrongCrisisResolution("Ora sono al sicuro"), false);
  assert.equal(analysis.needsCrisisFollowUp, true);
});

test("sicurezza e supporto umano espliciti consentono una chiusura protettiva", () => {
  const history = [
    { role: "user", content: "Non voglio più vivere" },
    { role: "assistant", content: "Contatta i servizi di emergenza locali." },
    { role: "user", content: "Ora sono al sicuro, sono con mia sorella e ho contattato i servizi" }
  ];
  const resolution = analyzeAurumConversationSafety(history, history[2].content);
  assert.equal(resolution.currentIsStrongResolution, true);
  assert.equal(resolution.needsCrisisFollowUp, true);
  assert.match(buildAurumCrisisFollowUpResponse(resolution), /non sia solo|assistenza umana/i);

  const later = analyzeAurumConversationSafety([
    ...history,
    { role: "assistant", content: buildAurumCrisisFollowUpResponse(resolution) },
    { role: "user", content: "Quanto vale l'oro 18 kt?" }
  ], "Quanto vale l'oro 18 kt?");
  assert.equal(later.resolvedAfterCrisis, true);
  assert.equal(later.needsCrisisFollowUp, false);
  assert.equal(later.hasSensitiveHistory, true);
});
