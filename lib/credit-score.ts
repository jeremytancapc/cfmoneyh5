/**
 * Income determination and loan eligibility engine.
 *
 * Rules source:
 *  - Eligibility: 18+; foreigners ≥ S$40k/year; income ≤ S$20k/year → max S$3k;
 *    otherwise max = 4× monthly income — all minus existing moneylender loans.
 *  - Income priority: CPF (if fresh) → NOA (if in window) → self-declared.
 */

import type { CpfContribution, NoaRecord } from "./loan-form";

// ─── CPF total rates by age bracket ───────────────────────────────────────────

const CPF_RATES: Array<{ maxAge: number; rate: number }> = [
  { maxAge: 55,  rate: 0.37 },
  { maxAge: 60,  rate: 0.34 },
  { maxAge: 65,  rate: 0.25 },
  { maxAge: 70,  rate: 0.165 },
  { maxAge: Infinity, rate: 0.125 },
];

function cpfTotalRate(ageAtApplication: number): number {
  return CPF_RATES.find((r) => ageAtApplication <= r.maxAge)?.rate ?? 0.125;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns age in completed years at the given reference date. */
export function ageAt(dob: string, referenceDate: Date = new Date()): number {
  if (!dob) return 0;
  const [y, m, d] = dob.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const hadBirthday =
    referenceDate.getMonth() > birth.getMonth() ||
    (referenceDate.getMonth() === birth.getMonth() &&
      referenceDate.getDate() >= birth.getDate());
  if (!hadBirthday) age--;
  return age;
}

/** "YYYY-MM" → integer months since year 0 for arithmetic. */
function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** Application month as "YYYY-MM". */
function applicationMonthStr(ref: Date = new Date()): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Source 1: CPF ────────────────────────────────────────────────────────────

export interface CpfScoringResult {
  eligible: boolean;
  latestMonth: string | null;
  monthsStale: number;
  avgMonthlyContribution: number;
  grossMonthlyIncome: number;
  cpfRate: number;
  ageUsed: number;
}

export function scoreCpf(
  contributions: CpfContribution[],
  dob: string,
  ref: Date = new Date(),
): CpfScoringResult {
  const appMonthIdx = monthIndex(applicationMonthStr(ref));
  const age = ageAt(dob, ref);
  const rate = dob ? cpfTotalRate(age) : 0.37; // fallback for foreigners / unknown

  if (!contributions.length) {
    return { eligible: false, latestMonth: null, monthsStale: Infinity, avgMonthlyContribution: 0, grossMonthlyIncome: 0, cpfRate: rate, ageUsed: age };
  }

  // Step 1 — aggregate by month
  const byMonth = new Map<string, number>();
  for (const row of contributions) {
    byMonth.set(row.month, (byMonth.get(row.month) ?? 0) + row.amount);
  }

  // Step 2 — find latest month
  const sortedMonths = [...byMonth.keys()].sort().reverse();
  const latestMonth = sortedMonths[0];
  const latestIdx = monthIndex(latestMonth);

  // Step 3 — staleness check (diff in calendar months)
  const monthsStale = appMonthIdx - latestIdx;
  const eligible = monthsStale <= 2;

  if (!eligible) {
    return { eligible: false, latestMonth, monthsStale, avgMonthlyContribution: 0, grossMonthlyIncome: 0, cpfRate: rate, ageUsed: age };
  }

  // Step 4 — 3-month average ending at latestIdx
  let total = 0;
  for (let offset = 0; offset < 3; offset++) {
    const targetIdx = latestIdx - offset;
    const [ty, tm1] = [Math.floor(targetIdx / 12), (targetIdx % 12) + 1];
    const key = `${ty}-${String(tm1).padStart(2, "0")}`;
    total += byMonth.get(key) ?? 0;
  }
  const avgMonthlyContribution = total / 3;

  // Step 5 — back-calculate gross income
  const grossMonthlyIncome = rate > 0 ? avgMonthlyContribution / rate : 0;

  return { eligible, latestMonth, monthsStale, avgMonthlyContribution, grossMonthlyIncome, cpfRate: rate, ageUsed: age };
}

// ─── Source 2: NOA ────────────────────────────────────────────────────────────

export interface NoaScoringResult {
  eligible: boolean;
  latestYa: string | null;
  monthsStale: string;
  annualIncome: number;
  grossMonthlyIncome: number;
}

export function scoreNoa(
  noaHistory: NoaRecord[],
  ref: Date = new Date(),
): NoaScoringResult {
  const appYear = ref.getFullYear();

  const parsed = noaHistory
    .filter((r) => r.yearOfAssessment && r.employmentIncome != null)
    .map((r) => ({ ya: Number(r.yearOfAssessment), income: r.employmentIncome }))
    .sort((a, b) => b.ya - a.ya);

  if (!parsed.length) {
    return { eligible: false, latestYa: null, monthsStale: "no records", annualIncome: 0, grossMonthlyIncome: 0 };
  }

  const latestYa = String(parsed[0].ya);
  const inWindow = parsed[0].ya >= appYear - 1 && parsed[0].ya <= appYear;

  if (!inWindow) {
    return { eligible: false, latestYa, monthsStale: `YA ${latestYa} is outside scoring window`, annualIncome: parsed[0].income, grossMonthlyIncome: 0 };
  }

  const annualIncome = parsed[0].income;
  const grossMonthlyIncome = annualIncome / 12;

  return { eligible: true, latestYa, monthsStale: "current", annualIncome, grossMonthlyIncome };
}

// ─── Final selection + loan eligibility ───────────────────────────────────────

export type IncomeSource = "cpf" | "noa" | "self_declared";

export interface CreditAssessment {
  /** Which income source was used for scoring. */
  incomeSource: IncomeSource;

  /** Final monthly income figure used (SGD). */
  verifiedMonthlyIncome: number;

  /** Age at application. */
  age: number;

  /** Whether the applicant meets minimum age (18). */
  meetsAgeRequirement: boolean;

  /** Minimum monthly income threshold for foreigners (S$40k/yr ÷ 12). */
  foreignerMinMonthlyIncome: number;

  /** Whether a foreigner meets the income floor (always true for SG/PR). */
  meetsForeignerIncomeFloor: boolean;

  /** Existing moneylender loan balance (SGD, 0 if declared none). */
  existingLoans: number;

  /** Maximum loan the applicant is eligible for before the cap. */
  maxEligibleLoan: number;

  /** Requested loan amount from the form. */
  requestedLoanAmount: number;

  /** Approved amount: min(requested, maxEligible), floored to nearest $100. */
  approvedLoanAmount: number;

  /** Whether the application is eligible for any loan. */
  isEligible: boolean;

  /** Human-readable explanation of the income determination. */
  explanation: string;

  // Intermediate scoring details (for audit / display)
  cpf: CpfScoringResult;
  noa: NoaScoringResult;
  selfDeclaredMonthlyIncome: number;
}

export function assessCredit(params: {
  dob: string;
  idType: string;
  cpfContributions: CpfContribution[];
  noaHistory: NoaRecord[];
  selfDeclaredMonthlyIncome: number;
  requestedLoanAmount: number;
  moneylenderNoLoans: boolean;
  moneylenderLoanAmount: string;
  ref?: Date;
}): CreditAssessment {
  const ref = params.ref ?? new Date();
  const age = ageAt(params.dob, ref);
  const isForeigner = params.idType === "foreigner";

  const cpf = scoreCpf(params.cpfContributions, params.dob, ref);
  const noa = scoreNoa(params.noaHistory, ref);
  const selfDeclared = Math.max(0, params.selfDeclaredMonthlyIncome);

  // Income selection — exact priority order from spec
  let incomeSource: IncomeSource;
  let verifiedMonthlyIncome: number;
  let explanation: string;

  if (!cpf.eligible && !noa.eligible) {
    incomeSource = "self_declared";
    verifiedMonthlyIncome = selfDeclared;
    explanation =
      cpf.latestMonth
        ? `CPF data is ${cpf.monthsStale} month(s) old (>2) and NOA is outside the scoring window. Using your declared income of S$${selfDeclared.toLocaleString()}/month.`
        : "No CPF or NOA data available. Using your declared income.";
  } else if (cpf.eligible && (!noa.eligible || cpf.grossMonthlyIncome >= noa.grossMonthlyIncome)) {
    incomeSource = "cpf";
    verifiedMonthlyIncome = cpf.grossMonthlyIncome;
    explanation = `Based on your CPF contributions (${cpf.latestMonth}, 3-month avg S$${Math.round(cpf.avgMonthlyContribution).toLocaleString()}/month), your gross monthly income is estimated at S$${Math.round(verifiedMonthlyIncome).toLocaleString()}.`;
  } else {
    incomeSource = "noa";
    verifiedMonthlyIncome = noa.grossMonthlyIncome;
    explanation = `Based on your Notice of Assessment (YA ${noa.latestYa}, annual income S$${noa.annualIncome.toLocaleString()}), your monthly income is S$${Math.round(verifiedMonthlyIncome).toLocaleString()}.`;
  }

  // Existing loans
  const existingLoans =
    params.moneylenderNoLoans
      ? 0
      : Math.max(0, parseInt(params.moneylenderLoanAmount, 10) || 0);

  // Eligibility checks
  const meetsAgeRequirement = age >= 18;
  const foreignerMinMonthlyIncome = 40000 / 12; // ~S$3,333/month
  const meetsForeignerIncomeFloor = !isForeigner || verifiedMonthlyIncome >= foreignerMinMonthlyIncome;

  // Loan cap calculation
  const annualIncome = verifiedMonthlyIncome * 12;
  let maxEligibleLoan: number;
  if (annualIncome <= 20000) {
    maxEligibleLoan = Math.max(0, 3000 - existingLoans);
  } else {
    maxEligibleLoan = Math.max(0, 4 * verifiedMonthlyIncome - existingLoans);
  }

  const isEligible =
    meetsAgeRequirement &&
    meetsForeignerIncomeFloor &&
    maxEligibleLoan > 0;

  // Approved = what they asked for, capped at eligibility max, rounded to nearest $100
  const rawApproved = Math.min(params.requestedLoanAmount, maxEligibleLoan);
  const approvedLoanAmount = isEligible ? Math.floor(rawApproved / 100) * 100 : 0;

  return {
    incomeSource,
    verifiedMonthlyIncome,
    age,
    meetsAgeRequirement,
    foreignerMinMonthlyIncome,
    meetsForeignerIncomeFloor,
    existingLoans,
    maxEligibleLoan,
    requestedLoanAmount: params.requestedLoanAmount,
    approvedLoanAmount,
    isEligible,
    explanation,
    cpf,
    noa,
    selfDeclaredMonthlyIncome: selfDeclared,
  };
}
