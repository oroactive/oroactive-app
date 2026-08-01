import {
  decimal,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  requireField,
  requireObject,
  toolResult
} from "./preciseDecimal.js";

const GRAMS_PER_UNIT = Object.freeze({
  mg: "0.001",
  g: "1",
  kg: "1000",
  troy_oz: "31.1034768",
  dwt: "1.55517384"
});

export function convertWeightUnits(input = {}) {
  const tool = "convertWeightUnits";
  requireObject(input, tool);
  const from = String(requireField(input, "from", tool)).trim().toLowerCase();
  const to = String(requireField(input, "to", tool)).trim().toLowerCase();
  if (!(from in GRAMS_PER_UNIT) || !(to in GRAMS_PER_UNIT)) {
    throw new TypeError(`${tool}: unità ammesse: ${Object.keys(GRAMS_PER_UNIT).join(", ")}.`);
  }
  const value = decimal(requireField(input, "value", tool), { name: "value", allowNegative: false });
  const grams = multiplyDecimal(value, decimal(GRAMS_PER_UNIT[from]));
  const converted = divideDecimal(grams, decimal(GRAMS_PER_UNIT[to]), { scale: 12 });
  return toolResult(tool, {
    convertedValue: formatDecimal(converted, { maxScale: 12 }),
    units: { input: from, convertedValue: to },
    formula: `convertedValue = value × ${GRAMS_PER_UNIT[from]} g/${from} ÷ ${GRAMS_PER_UNIT[to]} g/${to}`,
    assumptions: ["Oncia troy = 31,1034768 g; pennyweight = 1,55517384 g."],
    warnings: [],
    inputs: { value: formatDecimal(value), from, to }
  });
}

export default convertWeightUnits;
