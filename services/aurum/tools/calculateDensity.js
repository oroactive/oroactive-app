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

export function calculateDensity(input = {}) {
  const tool = "calculateDensity";
  requireObject(input, tool);
  const mode = String(input.mode || "direct").trim().toLowerCase();
  if (mode === "direct") {
    const mass = decimal(requireField(input, "mass", tool), { name: "mass", allowNegative: false, allowZero: false });
    const volume = decimal(requireField(input, "volume", tool), { name: "volume", allowNegative: false, allowZero: false });
    const density = divideDecimal(mass, volume, { scale: 12 });
    return toolResult(tool, {
      density: formatDecimal(density, { maxScale: 6 }),
      units: { mass: "g", volume: "cm³", density: "g/cm³" },
      formula: "density = mass / volume",
      assumptions: ["Massa in grammi e volume in centimetri cubi."],
      warnings: ["Porosità, cavità, pietre e parti eterogenee possono rendere la densità non rappresentativa."],
      inputs: { mass: formatDecimal(mass), volume: formatDecimal(volume), mode }
    });
  }
  if (mode === "hydrostatic") {
    const dryWeight = decimal(requireField(input, "dryWeight", tool), { name: "dryWeight", allowNegative: false, allowZero: false });
    const submergedWeight = decimal(requireField(input, "submergedWeight", tool), { name: "submergedWeight", allowNegative: false });
    const liquidDensity = decimal(requireField(input, "liquidDensity", tool), { name: "liquidDensity", allowNegative: false, allowZero: false });
    const displacement = subtractDecimal(dryWeight, submergedWeight);
    if (compareDecimal(displacement, 0) <= 0) {
      throw new RangeError(`${tool}: dryWeight deve essere maggiore di submergedWeight.`);
    }
    const density = multiplyDecimal(divideDecimal(dryWeight, displacement, { scale: 12 }), liquidDensity);
    return toolResult(tool, {
      density: formatDecimal(density, { maxScale: 6 }),
      units: { dryWeight: "g", submergedWeight: "g", liquidDensity: "g/cm³", density: "g/cm³" },
      formula: "density = dryWeight / (dryWeight - submergedWeight) × liquidDensity",
      assumptions: ["Il campione è completamente immerso senza bolle e la densità del liquido è stata fornita per la temperatura di prova."],
      warnings: ["Non usare il metodo su oggetti porosi, cavi, assemblati o incompatibili con l’immersione."],
      inputs: { dryWeight: formatDecimal(dryWeight), submergedWeight: formatDecimal(submergedWeight), liquidDensity: formatDecimal(liquidDensity), mode }
    });
  }
  throw new TypeError(`${tool}: mode deve essere direct o hydrostatic.`);
}

export default calculateDensity;
