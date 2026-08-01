import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryKnowledgeRepository } from "../services/aurum/knowledge/knowledgeRepository.js";
import { createEmbeddingService } from "../services/aurum/knowledge/embeddingService.js";
import { createRetrievalService } from "../services/aurum/knowledge/retrievalService.js";

function approved(id, overrides = {}) {
  return { id, title: `Titolo ${id}`, content: "oro titolo purezza procedura", domain: "precious_metals", jurisdiction: "IT", authority_level: 95, review_status: "approved", is_current: true, source_active: true, embedding: [1, 0], ...overrides };
}

test("retrieval ibrido filtra governance, prende 12 candidati e restituisce massimo 8", async () => {
  const chunks = Array.from({ length: 14 }, (_, index) => approved(`c${index}`, { authority_level: 95 - index }));
  chunks.push(approved("pending", { review_status: "pending", authority_level: 100 }));
  chunks.push(approved("us", { jurisdiction: "US", authority_level: 100 }));
  const repository = new InMemoryKnowledgeRepository({ chunks, procedures: [approved("p1", { type: "procedure", fact_type: "procedure" }), approved("p2", { type: "procedure", fact_type: "procedure" }), approved("p3", { type: "procedure", fact_type: "procedure" })] });
  const embeddings = createEmbeddingService({ embedMany: async (texts) => texts.map(() => [1, 0]) });
  const result = await createRetrievalService({ repository, embeddingService: embeddings }).retrieve("oro purezza", { jurisdiction: "IT", role: "commesso", domains: ["precious_metals"] });
  assert.ok(result.length <= 8);
  assert.ok(result.every((item) => item.review_status === "approved" && item.is_current && item.jurisdiction !== "US"));
  assert.ok(result.filter((item) => item.fact_type === "procedure").length <= 2);
});

test("solo i casi anonimizzati e approvati entrano come fonte supplementare di livello 70", async () => {
  const repository = new InMemoryKnowledgeRepository({
    cases: [
      approved("case-approved", { content: "contestazione peso lotto", authority_level: 70, fact_type: "case", source_key: "oroactive-casi-approvati" }),
      approved("case-pending", { content: "contestazione peso lotto", authority_level: 70, fact_type: "case", review_status: "pending" })
    ]
  });
  const result = await createRetrievalService({ repository }).retrieve("contestazione peso lotto", {
    jurisdiction: "IT",
    role: "responsabile",
    domains: ["precious_metals"],
    minimumAuthorityLevel: 95
  });
  assert.equal(result.filter((item) => item.fact_type === "case").length, 1);
  assert.equal(result.find((item) => item.fact_type === "case")?.source_key, "oroactive-casi-approvati");
});
