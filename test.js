// node test.js: hand-worked 1040-ES examples, CLI parsing, and data files in sync with the engine.
'use strict';
const assert = require('assert');
const { execFileSync } = require('child_process');
const T = require('./tax-engine.js');
const { parse } = require('./cli.js');

let n = 0;
const near = (a, b, msg) => { assert(Math.abs(a - b) < 0.01, `${msg}: ${a} != ${b}`); n++; };

// 2026, single, $85,000 profit, worked by hand from the 2026 Form 1040-ES worksheets:
//   SE: 85,000 x 0.9235 = 78,497.50; x 0.153 = 12,010.12; half = 6,005.06
//   AGI 78,994.94; minus 16,100 standard = 62,894.94; QBI = min(20% x 78,994.94, 20% x 62,894.94) = 12,578.99
//   taxable 50,315.95: 10% x 12,400 + 12% x 37,915.95 = 1,240 + 4,549.91 = 5,789.91
let r = T.estimate({ year: 2026, status: 'single', profit: 85000 });
near(r.se.tax, 12010.12, 'SE tax');
near(r.qbi, 12578.99, 'QBI');
near(r.regularTax, 5789.91, 'income tax');
near(r.totalTax, 17800.03, 'total');
near(r.quarterly, 0.9 * 17800.03 / 4, 'quarterly, 90% rule');
// Prior-year safe harbor: 100% of $14,000 is less than 90% of this year's tax.
r = T.estimate({ year: 2026, status: 'single', profit: 85000, priorTax: 14000, priorAgi: 90000 });
near(r.quarterly, 3500, 'quarterly, 100% prior-year');
r = T.estimate({ year: 2026, status: 'single', profit: 85000, priorTax: 14000, priorAgi: 160000 });
near(r.quarterly, 3850, 'quarterly, 110% prior-year');
// Social Security part stops at the wage base once W-2 wages use it up.
r = T.estimate({ year: 2026, status: 'single', profit: 50000, wages: 184500 });
near(r.se.socialSecurity, 0, 'SS capped by wages');
near(r.se.medicare, 50000 * 0.9235 * 0.029, 'Medicare not capped');
// Under $400 of net earnings: no SE tax.
near(T.seTax(400, 0, 2026).tax, 0, 'under $400 net earnings');

// CLI parsing
const p = parse(['--profit', '$85,000', '--status', 'mfj', '--year=2027', '--sstb']);
assert.deepStrictEqual([p.inp.profit, p.inp.status, p.inp.year, p.inp.sstb], [85000, 'mfj', 2027, true]); n++;
assert.throws(() => parse(['--status', 'single']), /--profit is required/); n++;
assert.throws(() => parse(['--profit', '1', '--year', '2019']), /--year/); n++;
assert.throws(() => parse(['--profit', '1', '--bogus', '2']), /unknown option/); n++;
const out = execFileSync(process.execPath, [require.resolve('./cli.js'), '--profit', '85000', '--prior-tax', '14000']).toString();
assert(out.includes('$3,500') && out.includes('$17,800'), out); n++;
const json = JSON.parse(execFileSync(process.execPath, [require.resolve('./cli.js'), '--profit', '85000', '--json']).toString());
near(json.totalTax, 17800.03, 'CLI --json');

// Random invariants: tax never decreases as profit rises; quarterly is a quarter of the annual amount.
for (let i = 0; i < 2000; i++) {
  const inp = { year: [2026, 2027][i % 2], status: ['single', 'mfj', 'mfs', 'hoh'][i % 4], profit: Math.random() * 700000,
    wages: Math.random() < 0.3 ? Math.random() * 250000 : 0 };
  const a = T.estimate(inp), b = T.estimate({ ...inp, profit: inp.profit + 100 });
  assert(b.totalTax >= a.totalTax - 1e-6, JSON.stringify(inp)); n++;
  near(a.quarterly * 4, a.annual, 'quarterly x 4');
}

// data/*.json must match the engine.
execFileSync(process.execPath, [require.resolve('./build-data.js'), '--check']); n++;
console.log(`all ${n} checks passed`);
