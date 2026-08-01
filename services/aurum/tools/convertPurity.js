import {
  compareDecimal,
  decimal,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  requireField,
  requireObject,
  toolResult
} from "./preciseDecimal.js";

const UNIT_MAXIMUMS = Object.freeze({ karat: "24", fineness: "1000", percent: "100", fraction: "1" });

export function convertPurity(input = {}) {
  const tool = "convertPurity";
  requireObject(input, tool);
  const from = String(requireField(input, "from", tool)).trim().toLowerCase();
  const to = String(requireField(input, "to", tool)).trim().toLowerCase();
  if (!(from in UNIT_MAXIMUMS) || !(to in UNIT_MAXIMUMS)) {
    throw new TypeError(`${tool}: unità ammesse: karat, fineness, percent, fraction.`);
  }
  const value = decimal(requireField(input, "value", tool), { name: "value", min: 0, max: UNIT_MAXIMUMS[from] });
  const fraction = divideDecimal(value, decimal(UNIT_MAXIMUMS[from]), { scale: 18 });
  const converted = multiplyDecimal(fraction, decimal(UNIT_MAXIMUMS[to]));
  return toolResult(tool, {
    convertedValue: formatDecimal(converted, { maxScale: 12 }),
    units: { input: from, convertedValue: to },
    formula: `convertedValue = value / ${UNIT_MAXIMUMS[from]} × ${UNIT_MAXIMUMS[to]}`,
    assumptions: ["24 carati, 1000 millesimi, 100 percento e frazione 1 rappresentano purezza teorica massima."],
    warnings: compareDecimal(converted, decimal(formatDecimal(converted, { maxScale: 12 }))) === 0
      ? []
      : ["Il risultato visualizzato è arrotondato a 12 decimali."],
    inputs: { value: formatDecimal(value), from, to }
  });
}

export default convertPurity;
