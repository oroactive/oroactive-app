import test from "node:test";
import assert from "node:assert/strict";
import { detectKnowledgeConflicts } from "../services/aurum/knowledge/conflictDetector.js";

test("il conflitto resta tracciato e l'autorità decide solo fuori dall'alto rischio", () => {
  const facts = [
    { id: "law", subject: "limite", predicate: "valore", object: 500, authority_level: 100 },
    { id: "policy", subject: "limite", predicate: "valore", object: 1000, authority_level: 85 }
  ];
  assert.equal(detectKnowledgeConflicts(facts)[0].winner.id, "law");
  assert.equal(detectKnowledgeConflicts(facts)[0].status, "resolved_by_authority");
  assert.equal(detectKnowledgeConflicts(facts, { riskLevel: "high" })[0].status, "manual_review_required");
});
