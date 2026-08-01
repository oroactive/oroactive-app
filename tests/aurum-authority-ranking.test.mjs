import test from "node:test";
import assert from "node:assert/strict";
import { rerankKnowledgeCandidates } from "../services/aurum/knowledge/reranker.js";
import { candidateIsEligible } from "../services/aurum/knowledge/retrievalService.js";

test("una legge prevale su policy e fonti secondarie", () => {
  const result = rerankKnowledgeCandidates([
    { id: "blog", authority_level: 40, lexical_score: 1, jurisdiction: "IT" },
    { id: "policy", authority_level: 85, lexical_score: 0.8, jurisdiction: "IT" },
    { id: "law", authority_level: 100, lexical_score: 0.8, jurisdiction: "IT" }
  ], { jurisdiction: "IT" }, 3);
  assert.equal(result[0].id, "law");
});

test("l'alto rischio esclude fonti deboli, scadute o non approvate", () => {
  const base = { review_status: "approved", is_current: true, source_active: true, jurisdiction: "IT", authority_level: 95 };
  assert.equal(candidateIsEligible({ ...base, authority_level: 85 }, { jurisdiction: "IT", minimumAuthorityLevel: 95 }), false);
  assert.equal(candidateIsEligible({ ...base, valid_to: "2020-01-01" }, { jurisdiction: "IT", asOf: "2026-01-01" }), false);
  assert.equal(candidateIsEligible({ ...base, review_status: "pending" }, { jurisdiction: "IT" }), false);
});
