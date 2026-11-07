# freelance-tax-estimator

US **federal quarterly estimated tax for freelancers and the self-employed**, for tax years **2026 and 2027**.
It follows the IRS Form 1040-ES worksheets line by line: self-employment tax (with the Social Security wage base),
the deduction for half of SE tax, the standard deduction, the QBI (Section 199A) deduction, ordinary brackets,
Additional Medicare Tax, and the 90% / 100% / 110% safe harbor rules.

- **Zero dependencies.** One file (`tax-engine.js`) that works in Node and in the browser.
- **CLI:** `npx github:Jesse-py/freelance-tax-estimator --profit 85000`
- **JSON data** for both years in [`data/`](data/), every number with its IRS or SSA source.
- **Tested:** hand-worked IRS worksheet examples plus 2,000 random invariant checks (`node test.js`).

Prefer a form? The same engine runs the free web version:
[Quarterly estimated tax calculator](https://jesse-py.github.io/simple-money-sheets/quarterly-estimated-tax-calculator/?utm_source=github&utm_medium=readme)
(and a [self-employment tax calculator](https://jesse-py.github.io/simple-money-sheets/self-employment-tax-calculator/?utm_source=github&utm_medium=readme)).

## CLI

```
$ npx github:Jesse-py/freelance-tax-estimator --profit 85000 --prior-tax 14000
Tax year 2026, filing status single, SE profit $85,000

  Self-employment tax         $12,010   (15.3% of 92.35% of profit, SS part capped)
  Income tax                   $5,790   (after $16,100 deduction, $12,579 QBI deduction)
  Total federal tax           $17,800
  Set aside per $1 earned       20.9%

  Required for the year       $14,000   (100% of last year's tax, minus withholding)
  Each quarterly payment       $3,500
  Due Apr 15, 2026 | Jun 15, 2026 | Sep 15, 2026 | Jan 15, 2027
```

Options: `--year 2026|2027`, `--status single|mfj|mfs|hoh`, `--wages`, `--spouse-wages`, `--other`,
`--adjustments`, `--itemized`, `--withholding`, `--prior-tax`, `--prior-agi`, `--paid`, `--sstb`, `--json`.
Run `--help` for details. Or clone the repo and run `node cli.js --profit 85000`.

## Library

```js
const T = require('./tax-engine.js');   // in a browser: <script src="tax-engine.js"></script> gives window.TaxEngine

const r = T.estimate({ year: 2026, status: 'single', profit: 85000, priorTax: 14000 });
r.se.tax       // 12010.12  self-employment tax
r.qbi          // 12578.99  QBI deduction
r.totalTax     // 17800.03
r.quarterly    // 3500      each estimated payment
r.due          // ['Apr 15, 2026', 'Jun 15, 2026', 'Sep 15, 2026', 'Jan 15, 2027']
r.setAside     // 0.209     share of each extra dollar of profit that goes to federal tax

T.seTax(85000, 0, 2026)                // Schedule SE pieces: earnings, socialSecurity, medicare, tax, deduction
T.incomeTax(50315.95, 2026, 'single')  // tax on taxable income from the brackets
T.YEARS[2027].brackets.mfj             // raw parameters
```

Inputs to `estimate()` (annual dollars): `year`, `status`, `profit` (Schedule C net profit), `wages`, `spouseWages`,
`otherIncome`, `adjustments`, `itemized` (0 = standard deduction), `charity`, `extraDeductions`, `sstb`, `credits`,
`refundableCredits`, `withholding`, `priorTax` (null = unknown), `priorAgi`, `paid`.

## Data

[`data/federal-2026.json`](data/federal-2026.json) and [`data/federal-2027.json`](data/federal-2027.json):
brackets for all four filing statuses, standard deductions, SE tax rates and wage base, Additional Medicare Tax
thresholds, QBI thresholds and phase-in ranges, safe harbor rules, and due dates. They're generated from
`tax-engine.js` by `node build-data.js`, so the data and the calculator can't drift apart.

| Year | Brackets, standard deduction, QBI | SS wage base |
|---|---|---|
| 2026 | [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) | $184,500 ([Form 1040-ES](https://www.irs.gov/pub/irs-pdf/f1040es.pdf)) |
| 2027 | [Rev. Proc. 2026-35](https://www.irs.gov/pub/irs-drop/rp-26-35.pdf) | $192,300 ([SSA](https://www.ssa.gov/news/en/cola/factsheets/2027.html)) |

The 2027 fourth-quarter due date (Jan 18, 2028) is computed from the weekend and holiday rules; the IRS hasn't
published the 2027 Form 1040-ES yet.

## What it doesn't cover

Federal only (no state tax). It assumes a sole proprietor with no employees and no depreciable business property
for the QBI limit, and it doesn't compute credits for you (pass them in). It isn't tax advice; check the result
against [Form 1040-ES](https://www.irs.gov/forms-pubs/about-form-1040-es) or a tax professional.

## Tracking income and expenses all year?

The [Freelancer Tax Tracker](https://jesse-py.github.io/simple-money-sheets/freelancer-tax-tracker/?utm_source=github&utm_medium=readme)
is an Excel workbook built on this same engine: log income and expenses, and it shows each quarterly payment
as the year goes. It's $12 and supports this project.

## License

MIT
