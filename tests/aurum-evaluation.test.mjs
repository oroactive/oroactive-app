import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AURUM_TOOL_REGISTRY } from "../services/aurum/tools/index.js";

const evaluationUrl = new URL("../evals/aurum/knowledge-evaluation.json", import.meta.url);
const generatorUrl = new URL("../scripts/generate-aurum-evals.mjs", import.meta.url);
const sourceRegistryUrl = new URL("../config/aurum-source-registry.json", import.meta.url);
const cases = JSON.parse(await readFile(evaluationUrl, "utf8"));
const generatorSource = await readFile(generatorUrl, "utf8");
const sourceRegistry = JSON.parse(await readFile(sourceRegistryUrl, "utf8"));
const registeredSourceKeys = new Set(sourceRegistry.sources.map(({ source_key: sourceKey }) => sourceKey));
const REQUIRED_KEYS = ["id", "domain", "question", "expectedSources", "requiredConcepts", "forbiddenClaims", "expectedTool", "riskLevel", "expectedEscalation"].sort();
const MINIMUM_DISTRIBUTION = {
  legal_compro_oro: 30, aml_ctf: 30, precious_metals: 25, assaying: 25,
  hallmarks: 20, jewellery_manufacturing: 20, gemology: 25, numismatics: 20,
  buyback_pricing: 20, foundry: 20, bullion_desk: 15, responsible_sourcing: 15,
  tax_accounting: 15, physical_security: 15, privacy: 10, store_operations: 15
};

test("il set contiene 325 casi univoci con schema esatto", () => {
  assert.equal(cases.length, 325);
  assert.equal(new Set(cases.map(({ id }) => id)).size, 325);
  assert.equal(new Set(cases.map(({ question }) => question)).size, 325);
  for (const item of cases) {
    assert.deepEqual(Object.keys(item).sort(), REQUIRED_KEYS, item.id);
    assert.match(item.id, /^[a-z_]+-\d{3}$/);
    assert.ok(item.question.length >= 25, item.id);
    assert.doesNotMatch(item.question, /\bcaso\s+\d+\b/i);
    assert.ok(Array.isArray(item.expectedSources) && item.expectedSources.length > 0, item.id);
    assert.ok(Array.isArray(item.requiredConcepts) && item.requiredConcepts.length > 0, item.id);
    assert.ok(Array.isArray(item.forbiddenClaims) && item.forbiddenClaims.length > 0, item.id);
    assert.ok(["low", "medium", "high", "critical"].includes(item.riskLevel), item.id);
    assert.ok(item.expectedEscalation === null || typeof item.expectedEscalation === "string", item.id);
    if (item.expectedTool !== null) assert.ok(item.expectedTool in AURUM_TOOL_REGISTRY, `${item.id}: ${item.expectedTool}`);
  }
});

test("la distribuzione copre tutti i minimi obbligatori", () => {
  const distribution = cases.reduce((counts, item) => ({ ...counts, [item.domain]: (counts[item.domain] || 0) + 1 }), {});
  for (const [domain, minimum] of Object.entries(MINIMUM_DISTRIBUTION)) {
    assert.ok(distribution[domain] >= minimum, `${domain}: ${distribution[domain] || 0}/${minimum}`);
  }
  assert.deepEqual(Object.keys(distribution).sort(), Object.keys(MINIMUM_DISTRIBUTION).sort());
});

test("tutte le fonti attese delle eval esistono nel registro ufficiale", () => {
  assert.ok(registeredSourceKeys.size > 0);
  for (const item of cases) {
    assert.equal(new Set(item.expectedSources).size, item.expectedSources.length, `${item.id}: fonti duplicate`);
    for (const sourceKey of item.expectedSources) {
      assert.ok(registeredSourceKeys.has(sourceKey), `${item.id}: fonte non registrata ${sourceKey}`);
    }
  }
});

test("i casi high risk richiedono fonti, cautele ed escalation", () => {
  for (const item of cases.filter(({ riskLevel }) => ["high", "critical"].includes(riskLevel))) {
    assert.ok(item.expectedSources.length >= 2, item.id);
    assert.ok(item.forbiddenClaims.length >= 2, item.id);
    assert.ok(item.expectedEscalation, item.id);
  }
});

test("il generatore è riproducibile e non usa rete o OpenAI", () => {
  assert.doesNotMatch(generatorSource, /from\s+["']openai["']|\bfetch\s*\(|https?\.request|WebSocket/i);
  const node = "/Users/christiandinato/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node";
  const regenerated = JSON.parse(execFileSync(node, [generatorUrl.pathname, "--stdout"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));
  assert.deepEqual(regenerated, cases);
});
