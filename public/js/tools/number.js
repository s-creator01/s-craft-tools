// S Craft — Number Tools Engine (100% Client-Side Pure JavaScript)

/**
 * Basic Math Evaluator (Safe, no eval)
 */
export function evaluateMathExpression(expr) {
  // Allow only numbers and arithmetic symbols
  const clean = expr.replace(/\s+/g, '');
  if (!/^[-+*/.()0-9]+$/.test(clean)) {
    throw new Error('Expression contains invalid characters');
  }

  // Safe evaluation via Function constructor with strict scope
  try {
    const fn = new Function(`"use strict"; return (${clean});`);
    const val = fn();
    if (typeof val !== 'number' || !isFinite(val)) {
      throw new Error('Calculation result is invalid');
    }
    return val;
  } catch {
    throw new Error('Invalid mathematical expression');
  }
}

/**
 * Percentage Calculations
 */
export function calculatePercentage(type, a, b) {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;

  switch (type) {
    case 'percentOf': // What is A% of B?
      return (numA / 100) * numB;
    case 'isWhatPercent': // A is what % of B?
      if (numB === 0) throw new Error('Cannot divide by zero');
      return (numA / numB) * 100;
    case 'percentChange': // % change from A to B
      if (numA === 0) throw new Error('Original value cannot be zero');
      return ((numB - numA) / Math.abs(numA)) * 100;
    default:
      return 0;
  }
}

/**
 * Unit Converter
 */
const UNIT_FACTORS = {
  length: {
    meter: 1,
    millimeter: 0.001,
    centimeter: 0.01,
    kilometer: 1000,
    inch: 0.0254,
    foot: 0.3048,
    yard: 0.9144,
    mile: 1609.344
  },
  mass: {
    kilogram: 1,
    milligram: 0.000001,
    gram: 0.001,
    metricTon: 1000,
    ounce: 0.0283495,
    pound: 0.453592
  },
  area: {
    squareMeter: 1,
    squareKilometer: 1000000,
    squareFoot: 0.092903,
    squareYard: 0.836127,
    acre: 4046.86,
    hectare: 10000
  },
  volume: {
    liter: 1,
    milliliter: 0.001,
    cubicMeter: 1000,
    gallon: 3.78541,
    quart: 0.946353,
    pint: 0.473176,
    fluidOunce: 0.0295735
  },
  data: {
    byte: 1,
    kilobyte: 1024,
    megabyte: 1048576,
    gigabyte: 1073741824,
    terabyte: 1099511627776
  }
};

export function convertUnits(category, value, fromUnit, toUnit) {
  const val = parseFloat(value) || 0;

  if (category === 'temperature') {
    // Celsius, Fahrenheit, Kelvin
    let celsius = val;
    if (fromUnit === 'fahrenheit') celsius = (val - 32) * (5 / 9);
    if (fromUnit === 'kelvin') celsius = val - 273.15;

    if (toUnit === 'celsius') return celsius;
    if (toUnit === 'fahrenheit') return celsius * (9 / 5) + 32;
    if (toUnit === 'kelvin') return celsius + 273.15;
    return celsius;
  }

  const table = UNIT_FACTORS[category];
  if (!table || !table[fromUnit] || !table[toUnit]) {
    throw new Error(`Unknown unit conversion: ${category}`);
  }

  const inBase = val * table[fromUnit];
  return inBase / table[toUnit];
}

/**
 * Ratio / Proportion Calculator
 * A : B = C : D
 */
export function solveProportion(a, b, c, d) {
  const numA = a !== '' ? parseFloat(a) : null;
  const numB = b !== '' ? parseFloat(b) : null;
  const numC = c !== '' ? parseFloat(c) : null;
  const numD = d !== '' ? parseFloat(d) : null;

  if (numA === null && numB !== null && numC !== null && numD !== null) {
    if (numD === 0) throw new Error('Cannot divide by zero');
    return { field: 'A', value: (numB * numC) / numD };
  }
  if (numB === null && numA !== null && numC !== null && numD !== null) {
    if (numC === 0) throw new Error('Cannot divide by zero');
    return { field: 'B', value: (numA * numD) / numC };
  }
  if (numC === null && numA !== null && numB !== null && numD !== null) {
    if (numB === 0) throw new Error('Cannot divide by zero');
    return { field: 'C', value: (numA * numD) / numB };
  }
  if (numD === null && numA !== null && numB !== null && numC !== null) {
    if (numA === 0) throw new Error('Cannot divide by zero');
    return { field: 'D', value: (numB * numC) / numA };
  }

  throw new Error('Leave exactly one field blank to solve');
}

export function simplifyRatio(w, h) {
  const numW = Math.round(parseFloat(w));
  const numH = Math.round(parseFloat(h));
  if (!numW || !numH) return '';

  const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
  const divisor = gcd(numW, numH);
  return `${numW / divisor} : ${numH / divisor}`;
}

/**
 * Average & Statistics
 */
export function calculateStatistics(numbersList) {
  if (!numbersList || numbersList.length === 0) {
    throw new Error('Please enter at least one number');
  }

  const count = numbersList.length;
  const sum = numbersList.reduce((acc, n) => acc + n, 0);
  const mean = sum / count;

  const sorted = [...numbersList].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  let median;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  const variance = numbersList.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    sum,
    mean: mean.toFixed(4),
    median: median.toFixed(4),
    min,
    max,
    range,
    stdDev: stdDev.toFixed(4)
  };
}

/**
 * Number to English Words
 */
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

function convertUnderThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ONES[num % 10] : '');
  } else if (num > 0) {
    str += ONES[num];
  }
  return str.trim();
}

export function numberToWords(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '';
  if (num === 0) return 'Zero';

  let str = '';
  let n = Math.abs(Math.floor(num));
  let scaleIdx = 0;

  if (n === 0) {
    str = 'Zero';
  } else {
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const chunkStr = convertUnderThousand(chunk);
        str = chunkStr + (SCALES[scaleIdx] ? ' ' + SCALES[scaleIdx] + ' ' : ' ') + str;
      }
      n = Math.floor(n / 1000);
      scaleIdx++;
    }
  }

  // Handle decimal part
  const decimalStr = String(val).split('.')[1];
  if (decimalStr) {
    str = str.trim() + ' point ' + decimalStr.split('').map(d => ONES[parseInt(d)] || 'zero').join(' ');
  }

  if (num < 0) str = 'Negative ' + str;
  return (str.charAt(0).toUpperCase() + str.slice(1)).trim();
}

/**
 * Rounding Numbers
 */
export function roundNumber(val, decimals = 2, method = 'round') {
  const n = parseFloat(val) || 0;
  const factor = Math.pow(10, decimals);
  switch (method) {
    case 'floor':
      return Math.floor(n * factor) / factor;
    case 'ceil':
      return Math.ceil(n * factor) / factor;
    case 'round':
    default:
      return Math.round(n * factor) / factor;
  }
}

/**
 * Number Base Converter
 */
export function convertNumberBase(value, fromBase = 10, toBase = 16) {
  const parsed = parseInt(String(value).trim(), fromBase);
  if (isNaN(parsed)) throw new Error('Invalid number for chosen base');
  return parsed.toString(toBase).toUpperCase();
}

/**
 * Discount & Tax Calculator
 */
export function calculateDiscount(price, discountPercent, taxPercent = 0) {
  const orig = parseFloat(price) || 0;
  const disc = parseFloat(discountPercent) || 0;
  const tax = parseFloat(taxPercent) || 0;

  const saved = orig * (disc / 100);
  const discounted = orig - saved;
  const taxAmount = discounted * (tax / 100);
  const finalPrice = discounted + taxAmount;

  return {
    originalPrice: orig.toFixed(2),
    savings: saved.toFixed(2),
    discountedPrice: discounted.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    finalPrice: finalPrice.toFixed(2)
  };
}

export function calculateEmi(principal,annualRatePercent,months) {
  const P=Number(principal), apr=Number(annualRatePercent), n=Number(months);
  if(!Number.isFinite(P)||P<=0||!Number.isFinite(apr)||apr<0||!Number.isInteger(n)||n<1||n>1200) throw new RangeError('Enter a positive loan amount, non-negative rate and 1–1200 months.');
  const r=apr/1200; const emi=r===0?P/n:P*r/(-Math.expm1(-n*Math.log1p(r)));
  return {emi,totalPaid:emi*n,totalInterest:emi*n-P};
}

export function convertManualCurrency(amount,rate) {
  const value=Number(amount), exchange=Number(rate);
  if(!Number.isFinite(value)||!Number.isFinite(exchange)||exchange<=0) throw new RangeError('Enter an amount and a positive rate you provide.');
  return {amount:value*exchange,rateSource:'user-entered',isLive:false};
}
