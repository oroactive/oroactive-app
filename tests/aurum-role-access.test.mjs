import assert from "node:assert/strict";
import test from "node:test";

import {
  AurumToolAccessError,
  executeAurumTool,
  listAurumToolsForRole
} from "../services/aurum/tools/index.js";

test("Founder vede tutti i tool, mentre i ruoli operativi non vedono margini e strategia", () => {
  assert.equal(listAurumToolsForRole("founder").length, 14);
  const commesso = new Set(listAurumToolsForRole("commesso").map(({ name }) => name));
  assert.ok(commesso.has("calculateFineMetal"));
  assert.ok(commesso.has("checkActCompleteness"));
  assert.ok(!commesso.has("calculateStoreMargin"));
  assert.ok(!commesso.has("compareMeltVsResale"));
  assert.ok(!commesso.has("scoreAmlIndicators"));
  assert.ok(!commesso.has("calculateBuybackPrice"));
});

test("il dispatcher rifiuta tool fuori allowlist e ruoli non autorizzati", () => {
  assert.throws(
    () => executeAurumTool("deleteEverything", {}, { role: "founder" }),
    (error) => error instanceof AurumToolAccessError && error.code === "UNKNOWN_TOOL" && error.status === 404
  );
  assert.throws(
    () => executeAurumTool("calculateStoreMargin", { revenue: "100", costOfGoods: "50", operatingCosts: "10" }, { role: "commesso" }),
    (error) => error instanceof AurumToolAccessError && error.code === "TOOL_FORBIDDEN" && error.status === 403
  );
  assert.throws(
    () => executeAurumTool("calculateFineMetal", { grossWeight: "10", nonPreciousWeight: "0", stoneWeight: "0", fineness: "750", weightUnit: "g" }, { role: "anonymous" }),
    /non è autorizzato/i
  );
});

test("solo Founder esegue calcoli di margine e confronto strategico", () => {
  const margin = executeAurumTool("calculateStoreMargin", { revenue: "1000", costOfGoods: "600", operatingCosts: "200" }, { role: "Founder" });
  assert.equal(margin.operatingMargin, "200.00");
  assert.deepEqual(margin.authorization, { role: "founder", domain: "business_management", riskLevel: "high" });
  const comparison = executeAurumTool("compareMeltVsResale", { meltNetValue: "900", resaleNetValue: "1000" }, { role: "founder" });
  assert.equal(comparison.higherNetValueRoute, "resale");
});

test("AML è limitato ai ruoli di controllo e non produce una decisione SOS", () => {
  const input = { indicators: [{ code: "FRACTIONING", observed: true, weight: "100" }] };
  const result = executeAurumTool("scoreAmlIndicators", input, { role: "responsabile" });
  assert.equal(result.sosDecision, null);
  assert.equal(result.authorization.riskLevel, "critical");
  assert.match(result.warnings.join(" "), /responsabile AML/i);
  assert.throws(() => executeAurumTool("scoreAmlIndicators", input, { role: "aiuto_commesso" }), /non è autorizzato/i);
});

test("il protocollo accessibile all’operatore resta non distruttivo", () => {
  const result = executeAurumTool("buildAssayProtocol", { materialType: "oro", methods: ["visual", "xrf", "chemical_analysis"] }, { role: "commesso" });
  assert.deepEqual(result.steps.map(({ method }) => method), ["visual", "xrf"]);
  assert.deepEqual(result.excludedMethods, ["chemical_analysis"]);
  assert.match(result.warnings.join(" "), /personale autorizzato/i);
  assert.equal(result.authorization.role, "commesso");
});
