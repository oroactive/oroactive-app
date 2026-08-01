import {
  compareDecimal,
  decimal,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  requireField,
  requireObject,
  subtractDecimal,
  toolResult
} from "./preciseDecimal.js";

export function calculateFoundryYield(input = {}) {
  const tool = "calculateFoundryYield";
  requireObject(input, tool);
  const inputFineWeight = decimal(requireField(input, "inputFineWeight", tool), { name: "inputFineWeight", allowNegative: false, allowZero: false });
  const outputFineWeight = decimal(requireField(input, "outputFineWeight", tool), { name: "outputFineWeight", allowNegative: false });
  const unit = String(requireField(input, "weightUnit", tool)).trim();
  const difference = subtractDecimal(outputFineWeight, inputFineWeight);
  const yieldPercent = multiplyDecimal(divideDecimal(outputFineWeight, inputFineWeight, { scale: 12 }), 100);
  return toolResult(tool, {
    yieldPercent: formatDecimal(yieldPercent, { maxScale: 6 }),
    weightDifference: formatDecimal(difference),
    lossWeight: compareDecimal(difference, 0) < 0 ? formatDecimal(multiplyDecimal(difference, -1)) : "0",
    units: { inputFineWeight: unit, outputFineWeight: unit, weightDifference: unit, lossWeight: unit, yieldPercent: "%" },
    formula: "yieldPercent = outputFineWeight / inputFineWeight × 100; weightDifference = outputFineWeight - inputFineWeight",
    assumptions: ["I pesi confrontati sono entrambi pesi di metallo fino nella stessa unità e riferiti allo stesso lotto."],
    warnings: compareDecimal(difference, 0) > 0
      ? ["La resa supera il 100%: verificare campionamento, titolo, umidità, contaminazioni e riferibilità del lotto."]
      : ["La differenza non identifica da sola la causa del calo; richiede riconciliazione documentale e tecnica."],
    inputs: { inputFineWeight: formatDecimal(inputFineWeight), outputFineWeight: formatDecimal(outputFineWeight) }
  });
}

export default calculateFoundryYield;
