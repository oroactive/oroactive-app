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

export function calculateStoreMargin(input = {}) {
  const tool = "calculateStoreMargin";
  requireObject(input, tool);
  const revenue = decimal(requireField(input, "revenue", tool), { name: "revenue", allowNegative: false, allowZero: false });
  const costOfGoods = decimal(requireField(input, "costOfGoods", tool), { name: "costOfGoods", allowNegative: false });
  const operatingCosts = decimal(requireField(input, "operatingCosts", tool), { name: "operatingCosts", allowNegative: false });
  const grossMargin = subtractDecimal(revenue, costOfGoods);
  const operatingMargin = subtractDecimal(grossMargin, operatingCosts);
  const operatingMarginPercent = multiplyDecimal(divideDecimal(operatingMargin, revenue, { scale: 12 }), 100);
  return toolResult(tool, {
    grossMargin: formatDecimal(grossMargin, { maxScale: 2, minScale: 2 }),
    operatingMargin: formatDecimal(operatingMargin, { maxScale: 2, minScale: 2 }),
    operatingMarginPercent: formatDecimal(operatingMarginPercent, { maxScale: 2, minScale: 2 }),
    profitable: compareDecimal(operatingMargin, 0) >= 0,
    units: { revenue: "EUR", costOfGoods: "EUR", operatingCosts: "EUR", grossMargin: "EUR", operatingMargin: "EUR", operatingMarginPercent: "%" },
    formula: "grossMargin = revenue - costOfGoods; operatingMargin = grossMargin - operatingCosts; operatingMarginPercent = operatingMargin / revenue × 100",
    assumptions: ["Ricavi e costi sono completi, omogenei per periodo, competenza, valuta e perimetro del negozio."],
    warnings: ["Indicatore gestionale riservato: non sostituisce bilancio, fiscalità, flussi di cassa o validazione del commercialista."],
    inputs: { revenue: formatDecimal(revenue), costOfGoods: formatDecimal(costOfGoods), operatingCosts: formatDecimal(operatingCosts) }
  });
}

export default calculateStoreMargin;
