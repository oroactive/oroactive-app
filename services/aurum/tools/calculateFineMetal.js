import {
  compareDecimal,
  decimal,
  formatDecimal,
  multiplyDecimal,
  requireField,
  requireObject,
  subtractDecimal,
  toolResult
} from "./preciseDecimal.js";

export function calculateFineMetal(input = {}) {
  const tool = "calculateFineMetal";
  requireObject(input, tool);
  const grossWeight = decimal(requireField(input, "grossWeight", tool), { name: "grossWeight", allowNegative: false, allowZero: false });
  const nonPreciousWeight = decimal(requireField(input, "nonPreciousWeight", tool), { name: "nonPreciousWeight", allowNegative: false });
  const stoneWeight = decimal(requireField(input, "stoneWeight", tool), { name: "stoneWeight", allowNegative: false });
  const fineness = decimal(requireField(input, "fineness", tool), { name: "fineness", min: 0, max: 1000 });
  const unit = String(requireField(input, "weightUnit", tool)).trim();
  if (!unit) throw new TypeError(`${tool}: weightUnit non valida.`);
  const netAfterNonPrecious = subtractDecimal(grossWeight, nonPreciousWeight);
  const netMetalWeight = subtractDecimal(netAfterNonPrecious, stoneWeight);
  if (compareDecimal(netMetalWeight, 0) < 0) {
    throw new RangeError(`${tool}: parti non preziose e pietre superano il peso lordo.`);
  }
  const fineMetalWeight = multiplyDecimal(netMetalWeight, fineness, decimal("0.001"));
  return toolResult(tool, {
    netMetalWeight: formatDecimal(netMetalWeight),
    fineMetalWeight: formatDecimal(fineMetalWeight),
    totalDeductions: formatDecimal(multiplyDecimal(1, subtractDecimal(grossWeight, netMetalWeight))),
    units: { netMetalWeight: unit, fineMetalWeight: unit, totalDeductions: unit, fineness: "‰" },
    formula: "netMetalWeight = grossWeight - nonPreciousWeight - stoneWeight; fineMetalWeight = netMetalWeight × fineness / 1000",
    assumptions: ["Il titolo è espresso in millesimi e i pesi usano la stessa unità."],
    warnings: compareDecimal(fineness, 1000) === 0 ? [] : ["Il risultato dipende dalla correttezza del titolo dichiarato o misurato."],
    inputs: {
      grossWeight: formatDecimal(grossWeight),
      nonPreciousWeight: formatDecimal(nonPreciousWeight),
      stoneWeight: formatDecimal(stoneWeight),
      fineness: formatDecimal(fineness)
    }
  });
}

export default calculateFineMetal;
