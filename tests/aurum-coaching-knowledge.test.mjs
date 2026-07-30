import assert from "node:assert/strict";
import test from "node:test";

import {
  AURUM_COACHING_STATS,
  buildCoachingKnowledgeAnswer,
  coachingKnowledgeSources,
  hasCoachingIntent,
  searchCoachingKnowledge
} from "../services/aurum/coachingKnowledge.js";

test("la base coaching deriva tutti i nove corsi e dichiara i propri limiti", () => {
  assert.equal(AURUM_COACHING_STATS.courseCount, 9);
  assert.equal(AURUM_COACHING_STATS.topicCount, 9);
  assert.equal(AURUM_COACHING_STATS.verifiedAt, "30 luglio 2026");
  assert.equal(AURUM_COACHING_STATS.professionalStandard, "ICF Core Competencies 2025");
  assert.ok(AURUM_COACHING_STATS.questionCount >= 60);
  assert.ok(AURUM_COACHING_STATS.exerciseCount >= 50);
});

const retrievalCases = [
  ["Mi sento un impostore e rimando sempre", "coaching_self_sabotage"],
  ["Mi sento bloccato e non so da dove iniziare", "coaching_self_sabotage"],
  ["Come posso delegare senza perdere il controllo del team?", "coaching_leadership"],
  ["Voglio dire di no senza diventare aggressivo", "coaching_relational_skills"],
  ["Voglio sviluppare capacità emotive", "coaching_relational_skills"],
  ["Come entro nello stato di flow senza sovraccaricarmi?", "coaching_flow"],
  ["Ho un blocco creativo e non trovo idee", "coaching_creativity"],
  ["Come trasformo un insight in un apprendimento stabile?", "coaching_learning"],
  ["Voglio crescere professionalmente", "coaching_learning"],
  ["Quali sono i confini etici tra coaching e terapia?", "coaching_ethics"],
  ["Il mio stato emotivo sta influenzando il team", "coaching_emotional_leadership"],
  ["Non riesco a staccare dal lavoro e sono sovraccarico", "coaching_work_life_balance"],
  ["Vorrei gestire meglio il tempo", "coaching_work_life_balance"],
  ["Voglio organizzarmi", "coaching_work_life_balance"],
  ["Cerco un migliore equilibrio vita-lavoro", "coaching_work_life_balance"]
];

for (const [query, expectedId] of retrievalCases) {
  test(`recupero coaching mirato: ${expectedId}`, () => {
    const result = searchCoachingKnowledge(query);
    assert.equal(result.matches[0]?.topic.id, expectedId);
    assert.equal(hasCoachingIntent(result), true);
  });
}

test("le domande operative estranee non vengono trasformate in coaching", () => {
  const result = searchCoachingKnowledge("Come verifico il titolo dell'oro con la pietra di paragone?");
  assert.equal(hasCoachingIntent(result), false);
  assert.deepEqual(result.matches, []);
});

test("la risposta deterministica resta dialogica, prudente e tracciabile", () => {
  const result = searchCoachingKnowledge("Mi sento un impostore e non sono abbastanza");
  const answer = buildCoachingKnowledgeAnswer("Mi sento un impostore e non sono abbastanza", result, {
    profile: {
      preferredName: "Lia",
      goals: ["espormi con maggiore sicurezza"]
    }
  });
  assert.match(answer.risposta, /Lia/);
  assert.match(answer.risposta, /non è una diagnosi|non formula diagnosi/i);
  assert.match(answer.risposta, /domanda|esplorare|riflettere/i);
  assert.match(answer.risposta, /micro-azione|passo/i);
  assert.match(answer.risposta, /A\.Co\.I\./);
  assert.equal((answer.risposta.match(/\?/g) || []).length, 1);
  assert.ok(answer.sources.length >= 2);
  assert.deepEqual(answer.sources, coachingKnowledgeSources(result));
});

test("le fonti pubbliche del coaching sono esclusivamente HTTPS e autorevoli", () => {
  const result = searchCoachingKnowledge("etica, riservatezza e contratto di coaching");
  const sources = coachingKnowledgeSources(result);
  assert.ok(sources.some((source) => /coachingfederation\.org/.test(source.url)));
  sources.forEach((source) => {
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.title);
    assert.ok(source.authority);
  });
});
