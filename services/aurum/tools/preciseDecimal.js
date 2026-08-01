const DECIMAL_PATTERN = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const MAX_INPUT_SCALE = 18;
const MAX_POWER = 36;

export class PreciseDecimalError extends TypeError {
  constructor(message, field = "") {
    super(message);
    this.name = "PreciseDecimalError";
    this.code = "INVALID_DECIMAL_INPUT";
    this.field = field;
  }
}

function powerOfTen(exponent) {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_POWER) {
    throw new PreciseDecimalError(`Scala decimale non supportata: ${exponent}.`);
  }
  return 10n ** BigInt(exponent);
}

function normalizeDecimal(value) {
  let coefficient = BigInt(value.coefficient);
  let scale = Number(value.scale || 0);
  if (coefficient === 0n) return Object.freeze({ coefficient: 0n, scale: 0 });
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return Object.freeze({ coefficient, scale });
}

export function decimal(value, options = {}) {
  const name = options.name || "valore";
  if (value && typeof value === "object" && typeof value.coefficient === "bigint" && Number.isInteger(value.scale)) {
    const result = normalizeDecimal(value);
    if (options.allowNegative === false && result.coefficient < 0n) {
      throw new PreciseDecimalError(`${name} non può essere negativo.`, name);
    }
    if (options.allowZero === false && result.coefficient === 0n) {
      throw new PreciseDecimalError(`${name} deve essere maggiore di zero.`, name);
    }
    return result;
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new PreciseDecimalError(`${name} deve essere un numero decimale esplicito.`, name);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new PreciseDecimalError(`${name} deve essere finito.`, name);
  }
  const raw = String(value).trim();
  if (!DECIMAL_PATTERN.test(raw)) {
    throw new PreciseDecimalError(`${name} deve usare il formato decimale senza esponenti o separatori ambigui.`, name);
  }
  const negative = raw.startsWith("-");
  const unsigned = raw.replace(/^[+-]/, "");
  const [integerPart, fractionPart = ""] = unsigned.split(".");
  if (fractionPart.length > (options.maxScale ?? MAX_INPUT_SCALE)) {
    throw new PreciseDecimalError(`${name} supera la precisione consentita.`, name);
  }
  const coefficient = BigInt(`${negative ? "-" : ""}${integerPart}${fractionPart}`);
  const result = normalizeDecimal({ coefficient, scale: fractionPart.length });
  if (options.allowNegative === false && result.coefficient < 0n) {
    throw new PreciseDecimalError(`${name} non può essere negativo.`, name);
  }
  if (options.allowZero === false && result.coefficient === 0n) {
    throw new PreciseDecimalError(`${name} deve essere maggiore di zero.`, name);
  }
  if (options.max !== undefined && compareDecimal(result, decimal(options.max, { name: `${name}.max` })) > 0) {
    throw new PreciseDecimalError(`${name} supera il massimo consentito.`, name);
  }
  if (options.min !== undefined && compareDecimal(result, decimal(options.min, { name: `${name}.min` })) < 0) {
    throw new PreciseDecimalError(`${name} è inferiore al minimo consentito.`, name);
  }
  return result;
}

function align(left, right) {
  const scale = Math.max(left.scale, right.scale);
  return {
    left: left.coefficient * powerOfTen(scale - left.scale),
    right: right.coefficient * powerOfTen(scale - right.scale),
    scale
  };
}

export function addDecimal(...values) {
  if (!values.length) return decimal(0);
  return values.map((value) => decimal(value)).reduce((total, current) => {
    const aligned = align(total, current);
    return normalizeDecimal({ coefficient: aligned.left + aligned.right, scale: aligned.scale });
  });
}

export function subtractDecimal(left, right) {
  const aligned = align(decimal(left), decimal(right));
  return normalizeDecimal({ coefficient: aligned.left - aligned.right, scale: aligned.scale });
}

export function multiplyDecimal(...values) {
  if (!values.length) return decimal(1);
  return values.map((value) => decimal(value)).reduce((total, current) => normalizeDecimal({
    coefficient: total.coefficient * current.coefficient,
    scale: total.scale + current.scale
  }));
}

function roundedQuotient(numerator, denominator) {
  if (denominator === 0n) throw new PreciseDecimalError("Divisione per zero.");
  const negative = (numerator < 0n) !== (denominator < 0n);
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  let quotient = absoluteNumerator / absoluteDenominator;
  const remainder = absoluteNumerator % absoluteDenominator;
  if (remainder * 2n >= absoluteDenominator) quotient += 1n;
  return negative ? -quotient : quotient;
}

export function divideDecimal(left, right, options = {}) {
  const numeratorValue = decimal(left);
  const denominatorValue = decimal(right, { allowZero: false });
  const scale = Number.isInteger(options.scale) ? options.scale : 12;
  if (scale < 0 || scale > 18) throw new PreciseDecimalError("La scala di divisione deve essere tra 0 e 18.");
  const numerator = numeratorValue.coefficient * powerOfTen(denominatorValue.scale + scale);
  const denominator = denominatorValue.coefficient * powerOfTen(numeratorValue.scale);
  return normalizeDecimal({ coefficient: roundedQuotient(numerator, denominator), scale });
}

export function absoluteDecimal(value) {
  const parsed = decimal(value);
  return parsed.coefficient < 0n
    ? Object.freeze({ coefficient: -parsed.coefficient, scale: parsed.scale })
    : parsed;
}

export function compareDecimal(left, right) {
  const aligned = align(decimal(left), decimal(right));
  return aligned.left === aligned.right ? 0 : aligned.left > aligned.right ? 1 : -1;
}

export function formatDecimal(value, options = {}) {
  let parsed = decimal(value);
  const maxScale = options.maxScale;
  if (Number.isInteger(maxScale) && maxScale >= 0 && parsed.scale > maxScale) {
    const divisor = powerOfTen(parsed.scale - maxScale);
    parsed = normalizeDecimal({ coefficient: roundedQuotient(parsed.coefficient, divisor), scale: maxScale });
  }
  const negative = parsed.coefficient < 0n;
  const digits = String(negative ? -parsed.coefficient : parsed.coefficient).padStart(parsed.scale + 1, "0");
  const integerPart = parsed.scale ? digits.slice(0, -parsed.scale) : digits;
  let fractionPart = parsed.scale ? digits.slice(-parsed.scale) : "";
  const minScale = Math.max(0, Number(options.minScale || 0));
  if (fractionPart.length < minScale) fractionPart = fractionPart.padEnd(minScale, "0");
  return `${negative ? "-" : ""}${integerPart}${fractionPart ? `.${fractionPart}` : ""}`;
}

export function percentToRatio(value, name = "percentuale") {
  return divideDecimal(decimal(value, { name, min: 0, max: 100 }), decimal(100), { scale: 18 });
}

export function requireObject(input, toolName) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${toolName}: input deve essere un oggetto.`);
  }
  return input;
}

export function requireField(input, field, toolName) {
  if (!(field in input) || input[field] === "" || input[field] === null || input[field] === undefined) {
    throw new TypeError(`${toolName}: campo obbligatorio mancante: ${field}.`);
  }
  return input[field];
}

export function toolResult(tool, payload = {}) {
  return Object.freeze({
    ok: payload.ok !== false,
    status: payload.status || (payload.ok === false ? "insufficient" : "calculated"),
    tool,
    ...payload,
    units: Object.freeze({ ...(payload.units || {}) }),
    formula: String(payload.formula || ""),
    assumptions: Object.freeze([...(payload.assumptions || [])]),
    warnings: Object.freeze([...(payload.warnings || [])]),
    missingInformation: Object.freeze([...(payload.missingInformation || [])])
  });
}

export function insufficientToolResult(tool, missingInformation, payload = {}) {
  return toolResult(tool, {
    ...payload,
    ok: false,
    status: "insufficient",
    missingInformation: Array.isArray(missingInformation) ? missingInformation : [missingInformation]
  });
}
