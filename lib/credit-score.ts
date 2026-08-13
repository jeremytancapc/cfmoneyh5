/**
 * Income determination and loan eligibility engine.
 *
 * Rules source:
 *  - Eligibility: 18+; foreigners ≥ S$40k/year; income ≤ S$20k/year → max S$3k − O/S balance;
 *    otherwise max = incomeMultiple × monthly income − declared moneylender O/S balance.
 *    incomeMultiple: no ML loans 4.5×; on_time 5.3×; late_14 4.9×; late_30 3.8×; late_60 2.9×; bad_debt 1.38×.
 *  - Income priority: CPF (if fresh, non-platform) → NOA (employmentIncome + tradeIncome) → self-declared.
 *  - Platform workers (Grab, Gojek, Foodpanda etc.) have CPF contribution rates far below the standard
 *    employee rate, so back-calculating their income from CPF gives a severe underestimate. Their CPF
 *    is detected by employer name and skipped; NOA trade income is used instead.
 */

import type { CpfContribution, NoaRecord } from "./loan-form";

// ─── Platform worker detection ────────────────────────────────────────────────

/**
 * Known platform operator name prefixes as they appear in Singpass CPF data.
 * Singpass truncates employer names at 30 characters, so some entries like
 * "TADA MOBILITY (SINGAPORE) (PLA" never show the full "(PLATFORM)" suffix —
 * prefix matching is the only reliable way to catch them.
 */
const PLATFORM_EMPLOYER_PREFIXES = [
  "GRABCAR",
  "GRAB SERVICES",
  "GOJEK",
  "DELIVERY HERO",
  "TADA MOBILITY",
  "EASYVAN",
  "RYDE TECHNOLOGIES",
  "FOODPANDA",
  "LALAMOVE",
];

/**
 * Returns true if the CPF employer string is a platform worker operator.
 * Checks for the full "(PLATFORM)" tag first, then falls back to known
 * company name prefixes to handle Singpass 30-char truncation.
 */
export function isPlatformEmployer(employer: string): boolean {
  const name = String(employer).toUpperCase().trim();
  if (name.includes("(PLATFORM)")) return true;
  return PLATFORM_EMPLOYER_PREFIXES.some((p) => name.startsWith(p));
}

/** Max loan = multiplier × verified monthly income − declared moneylender outstanding balance. */
export function moneylenderIncomeMultiplier(
  noLoans: boolean,
  paymentHistory: string,
): number {
  if (noLoans) return 4.5;
  switch (paymentHistory) {
    case "on_time":
    case "very_good":   // legacy value — kept for backwards compat
      return 5.3;
    case "late_14":
    case "good":        // legacy value — kept for backwards compat
      return 4.9;
    case "late_30":
    case "average":     // legacy value — kept for backwards compat
      return 3.8;
    case "late_60":
    case "poor":        // legacy value — kept for backwards compat
      return 2.9;
    case "bad_debt":
      return 1.38;
    default:
      return 1.38;
  }
}

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
  /**
   * True when every CPF contribution is from a platform operator (Grab, Gojek etc.).
   * These workers have CPF rates well below the standard employee rate so back-calculating
   * income from contributions gives a severe underestimate — income source is skipped.
   */
  isPlatformWorker: boolean;
}

export function scoreCpf(
  contributions: CpfContribution[],
  dob: string,
  ref: Date = new Date(),
): CpfScoringResult {
  const appMonthIdx = monthIndex(applicationMonthStr(ref));
  const age = ageAt(dob, ref);
  const rate = dob ? cpfTotalRate(age) : 0.37; // fallback for foreigners / unknown

  // Detect platform workers from ALL contributions regardless of staleness.
  // If every entry is from a known platform operator, the standard CPF back-calculation
  // would severely underestimate income (platform CPF rates are ~18% in 2026 vs 37% for
  // regular employees). assessCredit() uses this flag to skip CPF and fall through to NOA.
  const isPlatformWorker =
    contributions.length > 0 &&
    contributions.every((c) => isPlatformEmployer(c.employer));

  if (!contributions.length) {
    return { eligible: false, latestMonth: null, monthsStale: Infinity, avgMonthlyContribution: 0, grossMonthlyIncome: 0, cpfRate: rate, ageUsed: age, isPlatformWorker: false };
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
    return { eligible: false, latestMonth, monthsStale, avgMonthlyContribution: 0, grossMonthlyIncome: 0, cpfRate: rate, ageUsed: age, isPlatformWorker };
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

  return { eligible, latestMonth, monthsStale, avgMonthlyContribution, grossMonthlyIncome, cpfRate: rate, ageUsed: age, isPlatformWorker };
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
    .filter((r) => r.yearOfAssessment)
    .map((r) => ({
      ya: Number(r.yearOfAssessment),
      // Include trade income so gig workers / SEPs (Grab, freelancers etc.) are assessed correctly.
      // For regular employees tradeIncome is 0, so this is backward-compatible.
      income: (r.employmentIncome ?? 0) + (r.tradeIncome ?? 0),
    }))
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

/** Smallest loan we actually offer — an applicant eligible for less than this is rejected outright. */
export const MIN_LOAN_AMOUNT = 300;

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

  /** Declared moneylender balance (audit only; not subtracted from max loan). */
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
  moneylenderPaymentHistory: string;
  /** When `"manual"`, age eligibility is not enforced here (no verified DOB yet). */
  authMethod?: "" | "singpass" | "manual";
  ref?: Date;
}): CreditAssessment {
  const ref = params.ref ?? new Date();
  const age = ageAt(params.dob, ref);
  const isForeigner = params.idType === "foreigner";

  const cpf = scoreCpf(params.cpfContributions, params.dob, ref);
  const noa = scoreNoa(params.noaHistory, ref);
  const selfDeclared = Math.max(0, params.selfDeclaredMonthlyIncome);

  // Income selection — priority: CPF (if fresh AND not a platform worker) → NOA → self-declared.
  // Platform workers (Grab, Gojek etc.) skip BOTH CPF and NOA and go straight to self-declared.
  // CPF rates for platform workers are well below the standard employee rate so back-calculation
  // gives a severe underestimate. NOA trade income also lags a full year and may not reflect current
  // gig earnings accurately. Self-declared income verified at appointment instead.
  const isPlatformWorker = cpf.isPlatformWorker;
  const cpfUsableForIncome = cpf.eligible && !isPlatformWorker;
  const noaUsableForIncome = noa.eligible && !isPlatformWorker;

  let incomeSource: IncomeSource;
  let verifiedMonthlyIncome: number;
  let explanation: string;

  if (!cpfUsableForIncome && !noaUsableForIncome) {
    incomeSource = "self_declared";
    verifiedMonthlyIncome = selfDeclared;
    if (isPlatformWorker) {
      explanation = `CPF contributions are from a platform employer — income back-calculation does not apply and NOA is not used. Income will be verified at appointment. Using your declared income of S$${selfDeclared.toLocaleString()}/month.`;
    } else {
      explanation =
        cpf.latestMonth
          ? `CPF data is ${cpf.monthsStale} month(s) old (>2) and NOA is outside the scoring window. Using your declared income of S$${selfDeclared.toLocaleString()}/month.`
          : "No CPF or NOA data available. Using your declared income.";
    }
  } else if (cpfUsableForIncome && (!noaUsableForIncome || cpf.grossMonthlyIncome >= noa.grossMonthlyIncome)) {
    incomeSource = "cpf";
    verifiedMonthlyIncome = cpf.grossMonthlyIncome;
    explanation = `Based on your CPF contributions (${cpf.latestMonth}, 3-month avg S$${Math.round(cpf.avgMonthlyContribution).toLocaleString()}/month), your gross monthly income is estimated at S$${Math.round(verifiedMonthlyIncome).toLocaleString()}.`;
  } else {
    incomeSource = "noa";
    verifiedMonthlyIncome = noa.grossMonthlyIncome;
    explanation = `Based on your Notice of Assessment (YA ${noa.latestYa}, annual income S$${noa.annualIncome.toLocaleString()}), your monthly income is S$${Math.round(verifiedMonthlyIncome).toLocaleString()}.`;
  }

  // Declared moneylender balance (stored on lead / audit — not used to reduce max loan).
  const existingLoans =
    params.moneylenderNoLoans
      ? 0
      : Math.max(0, parseInt(params.moneylenderLoanAmount.replace(/,/g, ""), 10) || 0);

  const incomeMultiple = moneylenderIncomeMultiplier(
    params.moneylenderNoLoans,
    params.moneylenderPaymentHistory ?? "",
  );

  // Eligibility checks — manual path skips verified age until DOB is collected properly.
  const meetsAgeRequirement =
    params.authMethod === "manual" || age >= 18;
  const foreignerMinMonthlyIncome = 40000 / 12; // ~S$3,333/month
  const meetsForeignerIncomeFloor = !isForeigner || verifiedMonthlyIncome >= foreignerMinMonthlyIncome;

  // Loan cap calculation — declared O/S balance is always subtracted from the cap.
  const annualIncome = verifiedMonthlyIncome * 12;
  let maxEligibleLoan: number;
  if (annualIncome <= 20000) {
    maxEligibleLoan = Math.max(0, 3000 - existingLoans);
  } else {
    maxEligibleLoan = Math.max(0, incomeMultiple * verifiedMonthlyIncome - existingLoans);
  }

  const moneylenderNote =
    params.moneylenderNoLoans
      ? "No moneylender loans declared — capacity factor 4.5× monthly income."
      : `Moneylender payment record: ${incomeMultiple}× monthly income; declared O/S balance S$${existingLoans.toLocaleString()} deducted from cap.`;

  const explanationWithCap = `${explanation} ${moneylenderNote}`;

  const isEligible =
    meetsAgeRequirement &&
    meetsForeignerIncomeFloor &&
    maxEligibleLoan > MIN_LOAN_AMOUNT;

  // Approved = what they asked for, capped at eligibility max, floored to nearest $100
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
    explanation: explanationWithCap,
    cpf,
    noa,
    selfDeclaredMonthlyIncome: selfDeclared,
  };
}
