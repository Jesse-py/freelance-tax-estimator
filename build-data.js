// Writes data/federal-<year>.json from tax-engine.js, so the JSON and the calculator can't disagree.
// `node build-data.js --check` exits 1 if the files are out of date (used by test.js).
'use strict';
const fs = require('fs');
const path = require('path');
const T = require('./tax-engine.js');

const SOURCES = {
  2026: {
    brackets_standard_deduction_qbi: 'Rev. Proc. 2025-32, https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
    social_security_wage_base: '2026 Form 1040-ES, https://www.irs.gov/pub/irs-pdf/f1040es.pdf',
    se_tax_safe_harbor_due_dates: '2026 Form 1040-ES, https://www.irs.gov/pub/irs-pdf/f1040es.pdf',
  },
  2027: {
    brackets_standard_deduction_qbi: 'Rev. Proc. 2026-35, https://www.irs.gov/pub/irs-drop/rp-26-35.pdf',
    social_security_wage_base: 'SSA 2027 COLA fact sheet, https://www.ssa.gov/cola/',
    se_tax_safe_harbor_due_dates: 'Rules from the 2026 Form 1040-ES; Jan 18, 2028 date computed (weekend + MLK Day), not yet confirmed by the IRS',
  },
};
const STATUS = { single: 'single', mfj: 'married_filing_jointly', mfs: 'married_filing_separately', hoh: 'head_of_household' };

function build(year) {
  const y = T.YEARS[year];
  const byStatus = f => Object.fromEntries(Object.entries(STATUS).map(([k, name]) => [name, f(k)]));
  return {
    tax_year: Number(year),
    ordinary_income_brackets: byStatus(s => y.brackets[s].map(([from, rate], i, b) =>
      ({ rate, from, to: i + 1 < b.length ? b[i + 1][0] : null }))),
    standard_deduction: byStatus(s => y.standard[s]),
    self_employment_tax: { net_earnings_factor: 0.9235, social_security_rate: 0.124, medicare_rate: 0.029,
      social_security_wage_base: y.ssWageBase, minimum_net_earnings: 400 },
    additional_medicare_tax: { rate: 0.009, threshold: byStatus(s => T.ADDL_MEDICARE[s]) },
    qbi_deduction: { rate: 0.2, phase_in: byStatus(s => ({ threshold: y.qbi[s][0], end: y.qbi[s][1] })),
      minimum: { active_qbi_at_least: y.qbiMin.income, deduction: y.qbiMin.deduction } },
    estimated_tax: { current_year_safe_harbor: 0.9, prior_year_safe_harbor: 1.0, prior_year_safe_harbor_high_agi: 1.1,
      high_agi_threshold: { default: 150000, married_filing_separately: 75000 }, minimum_owed: 1000,
      due_dates: y.due, due_dates_confirmed: y.dueConfirmed },
    sources: SOURCES[year],
  };
}

const check = process.argv.includes('--check');
let stale = 0;
for (const year of Object.keys(T.YEARS)) {
  const file = path.join(__dirname, 'data', `federal-${year}.json`);
  const text = JSON.stringify(build(year), null, 2) + '\n';
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) { console.error(`stale: ${file}`); stale++; }
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`wrote ${file}`);
  }
}
process.exit(stale ? 1 : 0);
