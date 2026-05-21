import { describe, it, expect } from "vitest";
import {
  moneylenderIncomeMultiplier,
  ageAt,
  scoreCpf,
  scoreNoa,
  assessCredit,
} from "./credit-score";

// ─── Fixed reference date for all tests ──────────────────────────────────────
const REF = new Date("2026-05-21T10:00:00+08:00");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cpfMonth(month: string, amount: number) {
  return { month, amount, employer: amount * 0.17, paidOn: month + "-14" };
}

// ─── 1. moneylenderIncomeMultiplier ──────────────────────────────────────────

describe("moneylenderIncomeMultiplier", () => {
  it("returns 4.5× when noLoans is true regardless of history", () => {
    expect(moneylenderIncomeMultiplier(true, "bad_debt")).toBe(4.5);
    expect(moneylenderIncomeMultiplier(true, "")).toBe(4.5);
    expect(moneylenderIncomeMultiplier(true, "on_time")).toBe(4.5);
  });

  it("returns 5.3× for on_time", () => {
    expect(moneylenderIncomeMultiplier(false, "on_time")).toBe(5.3);
  });

  it("returns 4.9× for late_14", () => {
    expect(moneylenderIncomeMultiplier(false, "late_14")).toBe(4.9);
  });

  it("returns 3.8× for late_30", () => {
    expect(moneylenderIncomeMultiplier(false, "late_30")).toBe(3.8);
  });

  it("returns 2.9× for late_60", () => {
    expect(moneylenderIncomeMultiplier(false, "late_60")).toBe(2.9);
  });

  it("returns 1.38× for bad_debt", () => {
    expect(moneylenderIncomeMultiplier(false, "bad_debt")).toBe(1.38);
  });

  it("defaults to 1.38× for unknown/empty history", () => {
    expect(moneylenderIncomeMultiplier(false, "")).toBe(1.38);
    expect(moneylenderIncomeMultiplier(false, "unknown_value")).toBe(1.38);
  });

  // Legacy aliases
  it("handles legacy value very_good → 5.3×", () => {
    expect(moneylenderIncomeMultiplier(false, "very_good")).toBe(5.3);
  });

  it("handles legacy value poor → 2.9×", () => {
    expect(moneylenderIncomeMultiplier(false, "poor")).toBe(2.9);
  });
});

// ─── 2. ageAt ─────────────────────────────────────────────────────────────────

describe("ageAt", () => {
  it("returns 0 for empty dob", () => {
    expect(ageAt("", REF)).toBe(0);
  });

  it("calculates age correctly before birthday", () => {
    // born 1990-12-31, ref is 2026-05-21 → birthday not yet → 35
    expect(ageAt("1990-12-31", REF)).toBe(35);
  });

  it("calculates age correctly on birthday", () => {
    expect(ageAt("1990-05-21", REF)).toBe(36);
  });

  it("calculates age correctly after birthday", () => {
    expect(ageAt("1990-01-01", REF)).toBe(36);
  });

  it("returns 17 for someone not yet 18", () => {
    expect(ageAt("2008-12-31", REF)).toBe(17);
  });
});

// ─── 3. scoreCpf ─────────────────────────────────────────────────────────────

describe("scoreCpf", () => {
  it("returns ineligible for empty contributions", () => {
    const r = scoreCpf([], "1990-01-01", REF);
    expect(r.eligible).toBe(false);
    expect(r.grossMonthlyIncome).toBe(0);
  });

  it("returns ineligible when latest month is >2 months stale", () => {
    // REF is 2026-05, latest contribution is 2026-01 → 4 months stale
    const r = scoreCpf([cpfMonth("2026-01", 1000)], "1985-01-01", REF);
    expect(r.eligible).toBe(false);
    expect(r.monthsStale).toBe(4);
  });

  it("is eligible when latest month is exactly 2 months ago", () => {
    // REF 2026-05, latest 2026-03 → 2 months stale → eligible
    const contributions = [
      cpfMonth("2026-03", 1850),
      cpfMonth("2026-02", 1850),
      cpfMonth("2026-01", 1850),
    ];
    const r = scoreCpf(contributions, "1985-01-01", REF);
    expect(r.eligible).toBe(true);
    expect(r.monthsStale).toBe(2);
  });

  it("calculates gross income correctly using 3-month average (age ≤55, rate 0.37)", () => {
    // avg contribution = 1850/month, rate 0.37 → gross = 1850/0.37 = 5000
    const contributions = [
      cpfMonth("2026-04", 1850),
      cpfMonth("2026-03", 1850),
      cpfMonth("2026-02", 1850),
    ];
    const r = scoreCpf(contributions, "1985-01-01", REF);
    expect(r.eligible).toBe(true);
    expect(r.grossMonthlyIncome).toBeCloseTo(5000, 0);
  });

  it("uses correct CPF rate for age 56-60 (rate 0.34)", () => {
    // born 1967-01-01 → age 59 at REF
    const contributions = [
      cpfMonth("2026-04", 1700),
      cpfMonth("2026-03", 1700),
      cpfMonth("2026-02", 1700),
    ];
    const r = scoreCpf(contributions, "1967-01-01", REF);
    expect(r.cpfRate).toBe(0.34);
    expect(r.grossMonthlyIncome).toBeCloseTo(1700 / 0.34, 0);
  });
});

// ─── 4. scoreNoa ─────────────────────────────────────────────────────────────

describe("scoreNoa", () => {
  it("returns ineligible for empty history", () => {
    const r = scoreNoa([], REF);
    expect(r.eligible).toBe(false);
  });

  it("is eligible for YA = appYear - 1 (2025)", () => {
    const r = scoreNoa([{ yearOfAssessment: "2025", employmentIncome: 60000, assessableIncome: 60000 }], REF);
    expect(r.eligible).toBe(true);
    expect(r.grossMonthlyIncome).toBeCloseTo(5000, 0);
  });

  it("is eligible for YA = appYear (2026)", () => {
    const r = scoreNoa([{ yearOfAssessment: "2026", employmentIncome: 72000, assessableIncome: 72000 }], REF);
    expect(r.eligible).toBe(true);
    expect(r.grossMonthlyIncome).toBeCloseTo(6000, 0);
  });

  it("is ineligible for YA = 2024 (too old)", () => {
    const r = scoreNoa([{ yearOfAssessment: "2024", employmentIncome: 60000, assessableIncome: 60000 }], REF);
    expect(r.eligible).toBe(false);
  });
});

// ─── 5. assessCredit — core scenarios ────────────────────────────────────────

const BASE = {
  dob: "1990-01-01",
  idType: "singaporean",
  cpfContributions: [] as ReturnType<typeof cpfMonth>[],
  noaHistory: [] as { yearOfAssessment: string; employmentIncome: number; assessableIncome: number }[],
  selfDeclaredMonthlyIncome: 0,
  requestedLoanAmount: 10000,
  moneylenderNoLoans: true,
  moneylenderLoanAmount: "0",
  moneylenderPaymentHistory: "",
  authMethod: "manual" as const,
  ref: REF,
};

describe("assessCredit — income source selection", () => {
  it("uses self_declared when no CPF/NOA available", () => {
    const r = assessCredit({ ...BASE, selfDeclaredMonthlyIncome: 4000 });
    expect(r.incomeSource).toBe("self_declared");
    expect(r.verifiedMonthlyIncome).toBe(4000);
  });

  it("prefers CPF over self_declared when CPF is eligible", () => {
    const cpf = [
      cpfMonth("2026-04", 1850),
      cpfMonth("2026-03", 1850),
      cpfMonth("2026-02", 1850),
    ];
    const r = assessCredit({ ...BASE, cpfContributions: cpf, selfDeclaredMonthlyIncome: 2000 });
    expect(r.incomeSource).toBe("cpf");
    expect(r.verifiedMonthlyIncome).toBeCloseTo(5000, 0);
  });

  it("uses NOA when CPF is ineligible but NOA is current", () => {
    const noa = [{ yearOfAssessment: "2025", employmentIncome: 72000, assessableIncome: 72000 }];
    const r = assessCredit({ ...BASE, noaHistory: noa, selfDeclaredMonthlyIncome: 2000 });
    expect(r.incomeSource).toBe("noa");
    expect(r.verifiedMonthlyIncome).toBeCloseTo(6000, 0);
  });

  it("prefers CPF over NOA when CPF monthly ≥ NOA monthly", () => {
    const cpf = [cpfMonth("2026-04", 2590), cpfMonth("2026-03", 2590), cpfMonth("2026-02", 2590)];
    const noa = [{ yearOfAssessment: "2025", employmentIncome: 60000, assessableIncome: 60000 }];
    // CPF → 2590/0.37 ≈ 7000/month; NOA → 5000/month → CPF wins
    const r = assessCredit({ ...BASE, cpfContributions: cpf, noaHistory: noa });
    expect(r.incomeSource).toBe("cpf");
  });

  it("prefers NOA when NOA monthly > CPF monthly", () => {
    const cpf = [cpfMonth("2026-04", 1850), cpfMonth("2026-03", 1850), cpfMonth("2026-02", 1850)];
    const noa = [{ yearOfAssessment: "2025", employmentIncome: 120000, assessableIncome: 120000 }];
    // CPF → 5000/month; NOA → 10000/month → NOA wins
    const r = assessCredit({ ...BASE, cpfContributions: cpf, noaHistory: noa });
    expect(r.incomeSource).toBe("noa");
  });
});

describe("assessCredit — loan cap rules", () => {
  it("caps at $3,000 when annual income ≤ $20,000", () => {
    // $1,500/month × 12 = $18,000 ≤ $20,000
    const r = assessCredit({ ...BASE, selfDeclaredMonthlyIncome: 1500, requestedLoanAmount: 10000 });
    expect(r.maxEligibleLoan).toBe(3000);
    expect(r.approvedLoanAmount).toBe(3000);
  });

  it("returns max $3,000 − O/S when annual income ≤ $20,000 with existing loans", () => {
    const r = assessCredit({
      ...BASE,
      selfDeclaredMonthlyIncome: 1500,
      moneylenderNoLoans: false,
      moneylenderLoanAmount: "1000",
      moneylenderPaymentHistory: "on_time",
      requestedLoanAmount: 10000,
    });
    expect(r.maxEligibleLoan).toBe(2000); // 3000 - 1000
  });

  it("applies 4.5× for no moneylender loans", () => {
    // $5,000/month × 4.5 = $22,500 max
    const r = assessCredit({ ...BASE, selfDeclaredMonthlyIncome: 5000, moneylenderNoLoans: true, requestedLoanAmount: 20000 });
    expect(r.maxEligibleLoan).toBe(22500);
    expect(r.approvedLoanAmount).toBe(20000); // capped at requested
  });

  it("applies 5.3× for on_time payment history", () => {
    const r = assessCredit({
      ...BASE,
      selfDeclaredMonthlyIncome: 5000,
      moneylenderNoLoans: false,
      moneylenderLoanAmount: "0",
      moneylenderPaymentHistory: "on_time",
      requestedLoanAmount: 20000,
    });
    expect(r.maxEligibleLoan).toBeCloseTo(26500, 0); // 5000 × 5.3
  });

  it("deducts O/S moneylender balance from loan cap", () => {
    // $5,000/month × 5.3 = $26,500 − $5,000 O/S = $21,500
    const r = assessCredit({
      ...BASE,
      selfDeclaredMonthlyIncome: 5000,
      moneylenderNoLoans: false,
      moneylenderLoanAmount: "5000",
      moneylenderPaymentHistory: "on_time",
      requestedLoanAmount: 20000,
    });
    expect(r.existingLoans).toBe(5000);
    expect(r.maxEligibleLoan).toBeCloseTo(21500, 0);
  });

  it("strips commas from moneylenderLoanAmount before parsing", () => {
    const r = assessCredit({
      ...BASE,
      selfDeclaredMonthlyIncome: 5000,
      moneylenderNoLoans: false,
      moneylenderLoanAmount: "5,000",
      moneylenderPaymentHistory: "on_time",
      requestedLoanAmount: 20000,
    });
    expect(r.existingLoans).toBe(5000); // must NOT be 5 (pre-fix bug)
  });

  it("floors approved amount to nearest $100", () => {
    // $5,000 × 4.5 = $22,500 → requested $7,777 → floor to $7,700
    const r = assessCredit({ ...BASE, selfDeclaredMonthlyIncome: 5000, requestedLoanAmount: 7777 });
    expect(r.approvedLoanAmount).toBe(7700);
  });

  it("never approves more than requested", () => {
    const r = assessCredit({ ...BASE, selfDeclaredMonthlyIncome: 5000, requestedLoanAmount: 1000 });
    expect(r.approvedLoanAmount).toBe(1000);
  });
});

describe("assessCredit — eligibility flags", () => {
  it("skips age check for manual authMethod", () => {
    // No DOB → age = 0, but manual skips check
    const r = assessCredit({ ...BASE, dob: "", selfDeclaredMonthlyIncome: 5000, authMethod: "manual" });
    expect(r.meetsAgeRequirement).toBe(true);
    expect(r.isEligible).toBe(true);
  });

  it("enforces 18+ for singpass applicants", () => {
    // born 2010-01-01 → age 16 at REF
    const r = assessCredit({
      ...BASE,
      dob: "2010-01-01",
      selfDeclaredMonthlyIncome: 5000,
      authMethod: "singpass",
    });
    expect(r.meetsAgeRequirement).toBe(false);
    expect(r.isEligible).toBe(false);
    expect(r.approvedLoanAmount).toBe(0);
  });

  it("rejects foreigner below $40k/year income floor", () => {
    // $3,000/month = $36,000/yr < $40,000
    const r = assessCredit({ ...BASE, idType: "foreigner", selfDeclaredMonthlyIncome: 3000, authMethod: "singpass" });
    expect(r.meetsForeignerIncomeFloor).toBe(false);
    expect(r.isEligible).toBe(false);
  });

  it("approves foreigner at exactly $40k/year floor", () => {
    const r = assessCredit({
      ...BASE,
      idType: "foreigner",
      selfDeclaredMonthlyIncome: Math.ceil(40000 / 12),
      authMethod: "singpass",
      dob: "1990-01-01",
    });
    expect(r.meetsForeignerIncomeFloor).toBe(true);
  });

  it("returns approvedLoanAmount 0 when existing loans wipe out the $3k low-income cap", () => {
    // income = 0 → annual ≤ $20k → cap = $3,000 − $3,000 O/S = $0
    const r = assessCredit({
      ...BASE,
      selfDeclaredMonthlyIncome: 0,
      moneylenderNoLoans: false,
      moneylenderLoanAmount: "3000",
      moneylenderPaymentHistory: "on_time",
    });
    expect(r.maxEligibleLoan).toBe(0);
    expect(r.isEligible).toBe(false);
    expect(r.approvedLoanAmount).toBe(0);
  });

  it("returns ineligible when existing loans exceed cap", () => {
    // $5,000/month × 4.5 = $22,500 cap, but O/S is $30,000
    const r = assessCredit({
      ...BASE,
      selfDeclaredMonthlyIncome: 5000,
      moneylenderNoLoans: false,
      moneylenderLoanAmount: "30000",
      moneylenderPaymentHistory: "on_time",
    });
    expect(r.maxEligibleLoan).toBe(0);
    expect(r.isEligible).toBe(false);
  });
});

describe("assessCredit — all 5 payment history multipliers end-to-end", () => {
  const incomeParams = {
    ...BASE,
    selfDeclaredMonthlyIncome: 5000,
    moneylenderNoLoans: false,
    moneylenderLoanAmount: "0",
    requestedLoanAmount: 50000,
  };

  it("on_time → 5.3× → max $26,500", () => {
    const r = assessCredit({ ...incomeParams, moneylenderPaymentHistory: "on_time" });
    expect(r.maxEligibleLoan).toBeCloseTo(26500, 0);
  });

  it("late_14 → 4.9× → max $24,500", () => {
    const r = assessCredit({ ...incomeParams, moneylenderPaymentHistory: "late_14" });
    expect(r.maxEligibleLoan).toBeCloseTo(24500, 0);
  });

  it("late_30 → 3.8× → max $19,000", () => {
    const r = assessCredit({ ...incomeParams, moneylenderPaymentHistory: "late_30" });
    expect(r.maxEligibleLoan).toBeCloseTo(19000, 0);
  });

  it("late_60 → 2.9× → max $14,500", () => {
    const r = assessCredit({ ...incomeParams, moneylenderPaymentHistory: "late_60" });
    expect(r.maxEligibleLoan).toBeCloseTo(14500, 0);
  });

  it("bad_debt → 1.38× → max $6,900", () => {
    const r = assessCredit({ ...incomeParams, moneylenderPaymentHistory: "bad_debt" });
    expect(r.maxEligibleLoan).toBeCloseTo(6900, 0);
  });
});
