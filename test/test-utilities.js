// S Craft — Utilities Test Suite (Text, Time, Number)
import assert from 'assert';
import * as TextTools from '../public/js/tools/text.js';
import * as TimeTools from '../public/js/tools/time.js';
import * as NumberTools from '../public/js/tools/number.js';

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

export async function runUtilityTests() {
  console.log('\n--- Running Text, Time, and Number Tests ---');

  // Text Tests
  it('Text: Case conversion (UPPER, lower, Title, Sentence, camel, kebab, snake)', () => {
    const src = 'hello world! test-case';
    assert.strictEqual(TextTools.convertCase('hello world', 'upper'), 'HELLO WORLD');
    assert.strictEqual(TextTools.convertCase('HELLO WORLD', 'lower'), 'hello world');
    assert.strictEqual(TextTools.convertCase('hello world', 'title'), 'Hello World');
    assert.strictEqual(TextTools.convertCase('hello. world', 'sentence'), 'Hello. World');
    assert.strictEqual(TextTools.convertCase('hello world', 'camel'), 'helloWorld');
    assert.strictEqual(TextTools.convertCase('hello world', 'kebab'), 'hello-world');
    assert.strictEqual(TextTools.convertCase('hello world', 'snake'), 'hello_world');
  });

  it('Text: Word & Character statistics counter', () => {
    const text = 'The quick brown fox\njumps over the lazy dog.\n\nThird paragraph.';
    const s = TextTools.countTextStats(text);
    assert.strictEqual(s.words, 11);
    assert.strictEqual(s.lines, 4);
    assert.strictEqual(s.paragraphs, 2);
    assert.strictEqual(s.characters, text.length);
    assert.strictEqual(s.charactersNoSpaces, text.replace(/\s/g, '').length);
  });

  it('Text: Find and replace with case sensitivity', () => {
    const text = 'Apple apple APPLE';
    const r1 = TextTools.findAndReplace(text, 'apple', 'orange', false);
    assert.strictEqual(r1.count, 3);
    assert.strictEqual(r1.result, 'orange orange orange');

    const r2 = TextTools.findAndReplace(text, 'Apple', 'Orange', true);
    assert.strictEqual(r2.count, 1);
    assert.strictEqual(r2.result, 'Orange apple APPLE');
  });

  it('Text: Remove extra whitespace and blank lines', () => {
    const dirty = '   line   one   \n\n\n   line   two   \n';
    const clean = TextTools.removeSpacesAndBlanks(dirty);
    assert.strictEqual(clean, 'line one\nline two');
  });

  it('Text: Remove duplicate lines preserving first occurrence', () => {
    const lines = 'apple\nbanana\napple\norange\nbanana';
    const unique = TextTools.removeDuplicateLines(lines);
    assert.strictEqual(unique, 'apple\nbanana\norange');
  });

  it('Text: Sort lines (A-Z, Z-A, numeric)', () => {
    const fruits = 'banana\napple\ncherry';
    assert.strictEqual(TextTools.sortLines(fruits, 'az'), 'apple\nbanana\ncherry');
    assert.strictEqual(TextTools.sortLines(fruits, 'za'), 'cherry\nbanana\napple');

    const nums = '10\n2\n100\n25';
    assert.strictEqual(TextTools.sortLines(nums, 'numeric'), '2\n10\n25\n100');
  });

  it('Text: Line-by-line text difference', () => {
    const diff = TextTools.compareTextDiff('line 1\nline 2', 'line 1\nline 3');
    assert.strictEqual(diff.length, 3);
    assert.strictEqual(diff[0].type, 'same');
    assert.strictEqual(diff[1].type, 'removed');
    assert.strictEqual(diff[2].type, 'added');
  });

  it('Text: Deterministic random samples, extraction, and safe slugs', () => {
    const first = TextTools.generateRandomText({ mode: 'paragraphs', quantity: 2, sentencesPerParagraph: 2, seed: 42 });
    const second = TextTools.generateRandomText({ mode: 'paragraphs', quantity: 2, sentencesPerParagraph: 2, seed: 42 });
    assert.strictEqual(first.text, second.text);
    assert.strictEqual(first.text.split('\n\n').length, 2);
    assert.deepStrictEqual(TextTools.extractTextItems('a@b.com a@b.com https://example.com', 'email'), ['a@b.com']);
    assert.strictEqual(TextTools.makeSlug('Café Tools & Notes'), 'cafe-tools-notes');
  });

  // Time Tests
  it('Time: Date difference calculation with leap year semantics', () => {
    // 2024 is leap year
    const diff = TimeTools.calculateDateDifference('2024-02-28', '2024-03-01', false);
    assert.strictEqual(diff.totalDays, 2); // 29th and 1st
    assert.strictEqual(diff.days, 2);
  });

  it('Time: Date adjustment (Add/Subtract days, months, years)', () => {
    const adj = TimeTools.adjustDate('2026-01-15', 10, 'days', 'add');
    assert.strictEqual(adj.iso, '2026-01-25');

    const sub = TimeTools.adjustDate('2026-05-20', 2, 'months', 'subtract');
    assert.strictEqual(sub.iso, '2026-03-20');
  });

  it('Time: Duration converter', () => {
    const d = TimeTools.convertDuration(7200, 'seconds');
    assert.strictEqual(d.minutes, '120.00');
    assert.strictEqual(d.hours, '2.00');
  });

  it('Time: Timestamp conversion', () => {
    const ts = TimeTools.convertTimestamp(1700000000);
    assert.strictEqual(ts.unixSeconds, 1700000000);
    assert(ts.utc.includes('2023'));
  });

  it('Time: Age calculator', () => {
    const age = TimeTools.calculateAge('2000-01-01');
    assert(age.years >= 26);
    assert(age.totalDays > 9000);
  });

  it('Time: Business-day counts and date addition skip weekends and holidays', () => {
    assert.strictEqual(TimeTools.countBusinessDays('2026-10-23', '2026-10-28', { inclusive: true, holidays: ['2026-10-26'] }), 3);
    assert.strictEqual(TimeTools.addBusinessDays('2026-10-23', 1), '2026-10-26');
    assert.strictEqual(TimeTools.addBusinessDays('2026-10-23', 1, { holidays: ['2026-10-26'] }), '2026-10-27');
  });

  // Number Tests
  it('Number: Safe expression evaluation', () => {
    assert.strictEqual(NumberTools.evaluateMathExpression('(10 + 5) * 3 - 5 / 2'), 42.5);
    assert.throws(() => NumberTools.evaluateMathExpression('alert(1)'));
  });

  it('Number: Percentage calculations', () => {
    assert.strictEqual(NumberTools.calculatePercentage('percentOf', 20, 250), 50);
    assert.strictEqual(NumberTools.calculatePercentage('isWhatPercent', 50, 200), 25);
    assert.strictEqual(NumberTools.calculatePercentage('percentChange', 100, 150), 50);
  });

  it('Number: Unit conversions (Length, Mass, Temperature, Digital Data)', () => {
    const kmToM = NumberTools.convertUnits('length', 5, 'kilometer', 'meter');
    assert.strictEqual(kmToM, 5000);

    const kgToG = NumberTools.convertUnits('mass', 2.5, 'kilogram', 'gram');
    assert.strictEqual(kgToG, 2500);

    const cToF = NumberTools.convertUnits('temperature', 100, 'celsius', 'fahrenheit');
    assert.strictEqual(cToF, 212);

    const gbToMb = NumberTools.convertUnits('data', 1, 'gigabyte', 'megabyte');
    assert.strictEqual(gbToMb, 1024);
  });

  it('Number: Proportion solver and ratio simplifier', () => {
    const solved = NumberTools.solveProportion(1920, 1080, 1280, '');
    assert.strictEqual(solved.field, 'D');
    assert.strictEqual(solved.value, 720);

    assert.strictEqual(NumberTools.simplifyRatio(1920, 1080), '16 : 9');
  });

  it('Number: Statistical calculations (mean, median, sum, range)', () => {
    const stats = NumberTools.calculateStatistics([10, 20, 30, 40, 50]);
    assert.strictEqual(parseFloat(stats.mean), 30);
    assert.strictEqual(parseFloat(stats.median), 30);
    assert.strictEqual(stats.sum, 150);
    assert.strictEqual(stats.min, 10);
    assert.strictEqual(stats.max, 50);
  });

  it('Number: Number to Words (English)', () => {
    assert.strictEqual(NumberTools.numberToWords(0), 'Zero');
    assert.strictEqual(NumberTools.numberToWords(42), 'Forty-two');
    assert.strictEqual(NumberTools.numberToWords(1234), 'One thousand two hundred thirty-four');
  });

  it('Number: Rounding methods (round, floor, ceil)', () => {
    assert.strictEqual(NumberTools.roundNumber(12.3456, 2, 'round'), 12.35);
    assert.strictEqual(NumberTools.roundNumber(12.3456, 2, 'floor'), 12.34);
    assert.strictEqual(NumberTools.roundNumber(12.3411, 2, 'ceil'), 12.35);
  });

  it('Number: Number base conversion', () => {
    assert.strictEqual(NumberTools.convertNumberBase(255, 10, 16), 'FF');
    assert.strictEqual(NumberTools.convertNumberBase(255, 10, 2), '11111111');
    assert.strictEqual(NumberTools.convertNumberBase('FF', 16, 10), '255');
  });

  it('Number: Discount and sales tax calculation', () => {
    const disc = NumberTools.calculateDiscount(100, 20, 10);
    assert.strictEqual(disc.discountedPrice, '80.00');
    assert.strictEqual(disc.savings, '20.00');
    assert.strictEqual(disc.taxAmount, '8.00');
    assert.strictEqual(disc.finalPrice, '88.00');
  });

  it('Number: EMI estimates and explicitly user-entered currency rates', () => {
    const emi = NumberTools.calculateEmi(100000, 12, 12);
    assert(Math.abs(emi.emi - 8884.88) < 0.02);
    assert.strictEqual(NumberTools.calculateEmi(1200, 0, 12).emi, 100);
    assert.deepStrictEqual(NumberTools.convertManualCurrency(10, 83), { amount: 830, rateSource: 'user-entered', isLive: false });
    assert.throws(() => NumberTools.calculateEmi(-1, 12, 12));
    assert.throws(() => NumberTools.convertManualCurrency(10, 0));
  });

  console.log(`✓ All ${passed} utility tests passed cleanly!\n`);
  return { passed, total };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('test-utilities.js')) {
  runUtilityTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
