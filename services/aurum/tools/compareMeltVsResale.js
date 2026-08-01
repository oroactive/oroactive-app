import {
  compareDecimal,
  decimal,
  formatDecimal,
  requireField,
  requireObject,
  subtractDecimal,
  toolResult
} from "./preciseDecimal.js";

export function compareMeltVsResale(input = {}) {
  const tool = "compareMeltVsResale";
  requireObject(input, tool);
  const meltNetValue = decimal(requireField(input, "meltNetValue", tool), { name: "meltNetValue", allowNegative: false });
  const resaleNetValue = decimal(requireField(input, "resaleNetValue", tool), { name: "resaleNetValue", allowNegative: false });
  const difference = subtractDecimal(resaleNetValue, meltNetValue);
  const comparison = compareDecimal(resaleNetValue, meltNetValue);
  return toolResult(tool, {
    difference: formatDecimal(difference, { maxScale: 2, minScale: 2 }),
    higherNetValueRoute: comparison > 0 ? "resale" : comparison < 0 ? "melt" : "equal",
    units: { meltNetValue: "EUR", resaleNetValue: "EUR", difference: "EUR" },
    formula: "difference = resaleNetValue - meltNetValue",
    assumptions: ["Entrambi i valori sono netti di tutti i costi, rischi, tempi e imposte rilevanti e riferiti allo stesso bene."],
    warnings: ["Il confronto economico non autorizza la destinazione del bene e non sostituisce verifiche su autenticità, titolarità, vincoli e policy Founder."],
    inputs: { meltNetValue: formatDecimal(meltNetValue), resaleNetValue: formatDecimal(resaleNetValue) }
  });
}

export default compareMeltVsResale;
