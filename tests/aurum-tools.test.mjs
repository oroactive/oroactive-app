import assert from "node:assert/strict";
import test from "node:test";

import {
  AURUM_TOOL_REGISTRY,
  buildAssayProtocol,
  calculateBuybackPrice,
  calculateDensity,
  calculateFineMetal,
  calculateFoundryYield,
  calculateStoreMargin,
  checkActCompleteness,
  compareGemCandidates,
  compareMeltVsResale,
  convertPurity,
  convertWeightUnits,
  lookupHallmark,
  reconcileLotWeights,
  scoreAmlIndicators
} from "../services/aurum/tools/index.js";

function assertToolContract(result, name) {
  assert.equal(result.tool, name);
  assert.equal(typeof result.ok, "boolean");
  assert.equal(typeof result.status, "string");
  assert.equal(typeof result.formula, "string");
  assert.ok(result.formula.length > 0);
  assert.equal(typeof result.units, "object");
  assert.ok(Array.isArray(result.assumptions));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.missingInformation));
}

test("il registry espone esattamente i quattordici tool deterministici richiesti", () => {
  assert.deepEqual(Object.keys(AURUM_TOOL_REGISTRY).sort(), [
    "buildAssayProtocol", "calculateBuybackPrice", "calculateDensity", "calculateFineMetal",
    "calculateFoundryYield", "calculateStoreMargin", "checkActCompleteness", "compareGemCandidates",
    "compareMeltVsResale", "convertPurity", "convertWeightUnits", "lookupHallmark",
    "reconcileLotWeights", "scoreAmlIndicators"
  ].sort());
});

test("il calcolo del fino è esatto e sottrae esplicitamente pietre e parti non preziose", () => {
  const result = calculateFineMetal({ grossWeight: "10", nonPreciousWeight: "1", stoneWeight: "0.5", fineness: "750", weightUnit: "g" });
  assert.equal(result.netMetalWeight, "8.5");
  assert.equal(result.fineMetalWeight, "6.375");
  assert.equal(result.totalDeductions, "1.5");
  assertToolContract(result, "calculateFineMetal");
  assert.throws(() => calculateFineMetal({ grossWeight: "1", nonPreciousWeight: "2", stoneWeight: "0", fineness: "750", weightUnit: "g" }), /superano il peso lordo/i);
});

test("conversioni di purezza e peso rispettano costanti indipendenti", () => {
  const purity = convertPurity({ value: "18", from: "karat", to: "fineness" });
  assert.equal(purity.convertedValue, "750");
  assertToolContract(purity, "convertPurity");
  const weight = convertWeightUnits({ value: "1", from: "troy_oz", to: "g" });
  assert.equal(weight.convertedValue, "31.1034768");
  assertToolContract(weight, "convertWeightUnits");
  assert.throws(() => convertWeightUnits({ value: "1e3", from: "g", to: "kg" }), /formato decimale/i);
});

test("densità diretta e idrostatica validano fisica e unità", () => {
  const direct = calculateDensity({ mode: "direct", mass: "19.3", volume: "1" });
  assert.equal(direct.density, "19.3");
  assertToolContract(direct, "calculateDensity");
  const hydrostatic = calculateDensity({ mode: "hydrostatic", dryWeight: "19.3", submergedWeight: "18.3", liquidDensity: "1" });
  assert.equal(hydrostatic.density, "19.3");
  assert.throws(() => calculateDensity({ mode: "hydrostatic", dryWeight: "10", submergedWeight: "10", liquidDensity: "1" }), /deve essere maggiore/i);
});

test("buyback mostra formula completa senza inventare prezzo, recupero, costi o margine", () => {
  const result = calculateBuybackPrice({
    netMetalWeight: "10", fineness: "750", spotPricePerFineGram: "80",
    recoveryRatePercent: "98", totalCosts: "8", marginPercent: "10"
  });
  assert.equal(result.fineMetalWeight, "7.5");
  assert.equal(result.theoreticalValue, "600.00");
  assert.equal(result.recoveredValue, "588.00");
  assert.equal(result.maximumOffer, "522.00");
  assert.match(result.warnings.join(" "), /non.*quotazione garantita/i);
  assertToolContract(result, "calculateBuybackPrice");
  assert.throws(() => calculateBuybackPrice({ netMetalWeight: "10", fineness: "750" }), /campo obbligatorio/i);
});

test("resa e riconciliazione rilevano in modo indipendente calo e differenza fuori tolleranza", () => {
  const foundry = calculateFoundryYield({ inputFineWeight: "100", outputFineWeight: "98", weightUnit: "g" });
  assert.equal(foundry.yieldPercent, "98");
  assert.equal(foundry.lossWeight, "2");
  assertToolContract(foundry, "calculateFoundryYield");
  const reconciliation = reconcileLotWeights({ expectedWeight: "100", actualWeight: "99.8", tolerance: "0.1", weightUnit: "g" });
  assert.equal(reconciliation.difference, "-0.2");
  assert.equal(reconciliation.withinTolerance, false);
  assert.equal(reconciliation.outcome, "difference_detected");
  assert.match(reconciliation.warnings.join(" "), /sospendere/i);
  assertToolContract(reconciliation, "reconcileLotWeights");
});

test("confronto fusione-rivendita e margine negozio usano soli valori netti forniti", () => {
  const comparison = compareMeltVsResale({ meltNetValue: "950", resaleNetValue: "1120" });
  assert.equal(comparison.difference, "170.00");
  assert.equal(comparison.higherNetValueRoute, "resale");
  assertToolContract(comparison, "compareMeltVsResale");
  const margin = calculateStoreMargin({ revenue: "1000", costOfGoods: "600", operatingCosts: "200" });
  assert.equal(margin.grossMargin, "400.00");
  assert.equal(margin.operatingMargin, "200.00");
  assert.equal(margin.operatingMarginPercent, "20.00");
  assertToolContract(margin, "calculateStoreMargin");
});

test("completezza atto usa il dataset dei campi richiesti e non inventa obblighi", () => {
  const result = checkActCompleteness({ act: { customer: "Mario", payment: "" }, requiredFields: ["customer", { field: "payment", label: "Pagamento" }] });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingFields, [{ field: "payment", label: "Pagamento" }]);
  assertToolContract(result, "checkActCompleteness");
  assert.throws(() => checkActCompleteness({ act: {}, requiredFields: [] }), /elenco non vuoto/i);
});

test("protocollo saggio esclude metodi pericolosi e avverte sui rivestimenti XRF", () => {
  const result = buildAssayProtocol({ materialType: "gioiello in oro", methods: ["visual", "xrf", "acid", "cupellation"] });
  assert.deepEqual(result.steps.map(({ method }) => method), ["visual", "xrf"]);
  assert.deepEqual(result.excludedMethods, ["acid", "cupellation"]);
  assert.match(result.warnings.join(" "), /XRF.*superficie.*rivestiti/i);
  assert.match(result.warnings.join(" "), /distruttivi.*esclusi/i);
  assert.doesNotMatch(JSON.stringify(result), /millilitri|temperatura di fusione|concentrazione|dosaggio/i);
  assertToolContract(result, "buildAssayProtocol");
});

test("punzoni e candidati gemmologici restano insufficienti senza dataset", () => {
  const hallmarkMissing = lookupHallmark({ query: "750 VI 123", dataset: [] });
  assert.equal(hallmarkMissing.status, "insufficient");
  assertToolContract(hallmarkMissing, "lookupHallmark");
  const hallmark = lookupHallmark({ query: "750 VI", dataset: [{ code: "123 VI", fineness: "750", producer: "Laboratorio esempio" }] });
  assert.equal(hallmark.candidates.length, 1);
  assert.match(hallmark.warnings.join(" "), /non prova autenticità/i);
  const gemMissing = compareGemCandidates({ observations: { refractiveIndex: "1.77" }, candidates: [] });
  assert.equal(gemMissing.status, "insufficient");
  const gem = compareGemCandidates({
    observations: { refractiveIndex: "1.77", opticCharacter: "uniaxial" },
    candidates: [
      { id: "ruby", name: "Rubino", properties: { refractiveIndex: "1.77", opticCharacter: "uniaxial" } },
      { id: "glass", name: "Vetro", properties: { refractiveIndex: "1.52", opticCharacter: "isotropic" } }
    ]
  });
  assert.equal(gem.candidates[0].id, "ruby");
  assert.match(gem.warnings.join(" "), /non certifica autenticità/i);
  assertToolContract(gem, "compareGemCandidates");
});

test("lo score AML è solo supporto all’attenzione e non decide né invia SOS", () => {
  const result = scoreAmlIndicators({ indicators: [
    { code: "FRACTIONING", observed: true, weight: "30" },
    { code: "INCONSISTENT_PROFILE", observed: false, weight: "20" }
  ] });
  assert.equal(result.attentionScore, "60.00");
  assert.equal(result.sosDecision, null);
  assert.equal(result.decision, "no_automated_sos_decision");
  assert.match(result.warnings.join(" "), /non decide, compila o invia una SOS/i);
  assertToolContract(result, "scoreAmlIndicators");
});
