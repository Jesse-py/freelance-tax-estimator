#!/usr/bin/env node
// Command-line front end for tax-engine.js: federal quarterly estimated tax for the self-employed.
// Run `node cli.js --help` (or `npx github:Jesse-py/freelance-tax-estimator --help`).
'use strict';
const T = require('./tax-engine.js');

const HELP = `freelance-tax: US federal estimated tax for freelancers and the self-employed (${Object.keys(T.YEARS).join(', ')})

Usage: freelance-tax --profit <dollars> [options]

  --profit N         net self-employment profit for the year (Schedule C line 31)   [required]
  --year Y           tax year (${Object.keys(T.YEARS).join(' or ')}; default ${Object.keys(T.YEARS)[0]})
  --status S         single | mfj | mfs | hoh (default single)
  --wages N          your own W-2 wages
  --spouse-wages N   your spouse's W-2 wages (mfj only)
  --other N          other income (interest, etc.)
  --adjustments N    other above-the-line deductions (SEP-IRA, SE health insurance)
  --itemized N       itemized deductions (0 = standard deduction)
  --withholding N    federal income tax withheld from paychecks for the year
  --prior-tax N      total tax on last year's return (enables the 100%/110% safe harbor)
  --prior-agi N      last year's AGI (over $150k, or $75k mfs, means 110%)
  --paid N           estimated payments already made this year
  --sstb             you run a specified service business (affects the QBI phase-out)
  --json             print the full result as JSON

Example: freelance-tax --profit 85000 --status single --prior-tax 14000
Not tax advice. Federal only (no state tax). Web version: https://jesse-py.github.io/simple-money-sheets/quarterly-estimated-tax-calculator/`;

const FLAGS = { profit: 'profit', year: 'year', status: 'status', wages: 'wages', 'spouse-wages': 'spouseWages',
  other: 'otherIncome', adjustments: 'adjustments', itemized: 'itemized', withholding: 'withholding',
  'prior-tax': 'priorTax', 'prior-agi': 'priorAgi', paid: 'paid' };

function parse(argv) {
  const inp = { year: Number(Object.keys(T.YEARS)[0]), status: 'single', priorTax: null };
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (a === '--json') { json = true; continue; }
    if (a === '--sstb') { inp.sstb = true; continue; }
    const [flag, eq] = a.startsWith('--') ? a.slice(2).split('=', 2) : [null];
    if (!flag || !(flag in FLAGS)) throw new Error(`unknown option: ${a}`);
    const v = eq !== undefined ? eq : argv[++i];
    if (v === undefined) throw new Error(`--${flag} needs a value`);
    if (flag === 'status') {
      if (!['single', 'mfj', 'mfs', 'hoh'].includes(v)) throw new Error('--status must be single, mfj, mfs or hoh');
      inp.status = v;
    } else {
      const n = Number(String(v).replace(/[$,_]/g, ''));
      if (!Number.isFinite(n)) throw new Error(`--${flag}: not a number: ${v}`);
      inp[FLAGS[flag]] = n;
    }
  }
  if (!T.YEARS[inp.year]) throw new Error(`--year must be one of ${Object.keys(T.YEARS).join(', ')}`);
  if (inp.profit === undefined) throw new Error('--profit is required (try --help)');
  return { inp, json };
}

const usd = x => (x < 0 ? '-$' : '$') + Math.round(Math.abs(x)).toLocaleString('en-US');

function report(r, inp) {
  const lines = [
    `Tax year ${r.year}, filing status ${r.status}, SE profit ${usd(inp.profit)}`,
    '',
    `  Self-employment tax      ${usd(r.se.tax).padStart(10)}   (15.3% of 92.35% of profit, SS part capped)`,
    `  Income tax               ${usd(r.afterCredits).padStart(10)}   (after ${usd(r.deduction)} deduction, ${usd(r.qbi)} QBI deduction)`,
    r.addlMedicare ? `  Additional Medicare tax  ${usd(r.addlMedicare).padStart(10)}` : null,
    `  Total federal tax        ${usd(r.totalTax).padStart(10)}`,
    `  Set aside per $1 earned  ${(r.setAside * 100).toFixed(1).padStart(9)}%`,
    '',
  ];
  if (r.mustPay) {
    lines.push(`  Required for the year    ${usd(r.annual).padStart(10)}   (${r.priorReq !== null && r.required === r.priorReq ? `${Math.round(r.priorPct * 100)}% of last year's tax` : '90% of this year\'s tax'}, minus withholding)`);
    lines.push(`  Each quarterly payment   ${usd(r.quarterly).padStart(10)}`);
    lines.push(`  Due ${r.due.join(' | ')}${r.dueConfirmed ? '' : ' (last date not yet confirmed by the IRS)'}`);
    if (inp.paid) lines.push(`  Still to pay this year   ${usd(r.remaining).padStart(10)}`);
  } else {
    const why = { withholding: 'your withholding covers the required amount', under1000: 'you will owe less than $1,000 after withholding',
      noPriorTax: 'you had no tax liability last year' }[r.totalTax === 0 ? 'none' : r.reason] || 'you owe no federal tax';
    lines.push(`  No estimated payments required: ${why}.`);
  }
  lines.push('', 'Federal only, simplified (see README). Not tax advice. Check IRS Form 1040-ES.');
  return lines.filter(l => l !== null).join('\n');
}

if (require.main === module) {
  try {
    const p = parse(process.argv.slice(2));
    if (p.help) { console.log(HELP); process.exit(0); }
    const r = T.estimate(p.inp);
    console.log(p.json ? JSON.stringify(r, null, 2) : report(r, p.inp));
  } catch (e) {
    console.error(`freelance-tax: ${e.message}`);
    process.exit(2);
  }
}

module.exports = { parse, report };
