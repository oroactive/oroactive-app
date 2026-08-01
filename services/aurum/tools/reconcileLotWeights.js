import {
  absoluteDecimal,
  compareDecimal,
  decimal,
  formatDecimal,
  requireField,
  requireObject,
  subtractDecimal,
  toolResult
} from "./preciseDecimal.js";

export function reconcileLotWeights(input = {}) {
  const tool = "reconcileLotWeights";
  requireObject(input, tool);
  const expectedWeight = decimal(requireField(input, "expectedWeight", tool), { name: "expectedWeight", allowNegative: false });
  const actualWeight = decimal(requireField(input, "actualWeight", tool), { name: "actualWeight", allowNegative: false });
  const tolerance = decimal(requireField(input, "tolerance", tool), { name: "tolerance", allowNegative: false });
  const unit = String(requireField(input, "weightUnit", tool)).trim();
  const difference = subtractDecimal(actualWeight, expectedWeight);
  const absoluteDifference = absoluteDecimal(difference);
  const withinTolerance = compareDecimal(absoluteDifference, tolerance) <= 0;
  return toolResult(tool, {
    difference: formatDecimal(difference),
    absoluteDifference: formatDecimal(absoluteDifference),
    withinTolerance,
    outcome: withinTolerance ? "reconciled" : "difference_detected",
    units: { expectedWeight: unit, actualWeight: unit, tolerance: unit, difference: unit, absoluteDifference: unit },
    formula: "difference = actualWeight - expectedWeight; withinTolerance = |difference| ≤ tolerance",
    assumptions: ["Pesi, tara, unità e identità del lotto sono omogenei tra atteso e rilevato."],
    warnings: withinTolerance ? [] : ["Differenza fuori tolleranza: sospendere la chiusura e verificare pesate, tara, sigilli, movimenti e documenti."],
    inputs: { expectedWeight: formatDecimal(expectedWeight), actualWeight: formatDecimal(actualWeight), tolerance: formatDecimal(tolerance) }
  });
}

export default reconcileLotWeights;
