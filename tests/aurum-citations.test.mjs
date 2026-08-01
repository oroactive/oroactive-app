import test from "node:test";
import assert from "node:assert/strict";
import { buildCitations } from "../services/aurum/knowledge/citationBuilder.js";
import { validateAurumAnswer, INSUFFICIENT_EVIDENCE_ANSWER } from "../services/aurum/knowledge/answerValidator.js";

test("le citazioni sono strutturate, deduplicate e limitate a quattro", () => {
  const items = Array.from({ length: 6 }, (_, index) => ({ source_key: `s${index}`, organization: "Ente", title: `Fonte ${index}`, version_label: "1", section_path: "Articolo 1", authority_level: 100 - index, review_status: "approved", is_current: true }));
  const citations = buildCitations(items);
  assert.equal(citations.length, 4);
  assert.deepEqual(Object.keys(citations[0]).sort(), ["article", "authority_level", "effective_from", "effective_to", "organization", "retrieved_at", "section", "source_key", "title", "url", "version"].sort());
});

test("senza fonti adeguate Aurum dichiara insufficienza", () => {
  const result = validateAurumAnswer({ answer: "Risposta non provata", risk_level: "high", citations: [] });
  assert.equal(result.confidence, "INSUFFICIENTE");
  assert.equal(result.answer, INSUFFICIENT_EVIDENCE_ANSWER);
});
