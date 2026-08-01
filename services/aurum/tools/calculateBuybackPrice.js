import {
  compareDecimal,
  decimal,
  formatDecimal,
  multiplyDecimal,
  percentToRatio,
  requireField,
  requireObject,
  subtractDecimal,
  toolResult
} from "./preciseDecimal.js";

export function calculateBuybackPrice(input = {}) {
  const tool = "calculateBuybackPrice";
  requireObject(input, tool);
  const netMetalWeight = decimal(requireField(input, "netMetalWeight", tool), { name: "netMetalWeight", allowNegative: false, allowZero: false });
  const fineness = decimal(requireField(input, "fineness", tool), { name: "fineness", min: 0, max: 1000 });
  const spotPricePerFineGram = decimal(requireField(input, "spotPricePerFineGram", tool), { name: "spotPricePerFineGram", allowNegative: false, allowZero: false });
  const recoveryRate = percentToRatio(requireField(input, "recoveryRatePercent", tool), "recoveryRatePercent");
  const totalCosts = decimal(requireField(input, "totalCosts", tool), { name: "totalCosts", allowNegative: false });
  const marginRate = percentToRatio(requireField(input, "marginPercent", tool), "marginPercent");
  const fineMetalWeight = multiplyDecimal(netMetalWeight, fineness, decimal("0.001"));
  const theoreticalValue = multiplyDecimal(fineMetalWeight, spotPricePerFineGram);
  const recoveredValue = multiplyDecimal(theoreticalValue, recoveryRate);
  const valueAfterCosts = subtractDecimal(recoveredValue, totalCosts);
  if (compareDecimal(valueAfterCosts, 0) < 0) throw new RangeError(`${tool}: i costi superano il valore recuperabile.`);
  const offer = multiplyDecimal(valueAfterCosts, subtractDecimal(1, marginRate));
  return toolResult(tool, {
    fineMetalWeight: formatDecimal(fineMetalWeight),
    theoreticalValue: formatDecimal(theoreticalValue, { maxScale: 2, minScale: 2 }),
    recoveredValue: formatDecimal(recoveredValue, { maxScale: 2, minScale: 2 }),
    maximumOffer: formatDecimal(offer, { maxScale: 2, minScale: 2 }),
    units: { netMetalWeight: "g", fineMetalWeight: "g", spotPricePerFineGram: "EUR/g fine", theoreticalValue: "EUR", recoveredValue: "EUR", maximumOffer: "EUR" },
    formula: "fine = net × fineness / 1000; recovered = fine × spot × recovery%; maximumOffer = (recovered - costs) × (1 - margin%)",
    assumptions: ["Prezzo spot, recupero, costi e margine sono stati forniti esplicitamente e sono validi per lo stesso scenario temporale."],
    warnings: ["È un massimo matematico basato sugli input, non una quotazione garantita né un’autorizzazione al pagamento."],
    inputs: {
      netMetalWeight: formatDecimal(netMetalWeight),
      fineness: formatDecimal(fineness),
      spotPricePerFineGram: formatDecimal(spotPricePerFineGram),
      recoveryRatePercent: String(input.recoveryRatePercent),
      totalCosts: formatDecimal(totalCosts),
      marginPercent: String(input.marginPercent)
    }
  });
}

export default calculateBuybackPrice;
