import { describe, it, expect } from "vitest";
import { deriveCreditRejectionReason, creditRejectionLabel } from "./credit-rejection";
import type { CreditAssessment } from "./credit-score";

const BASE: Pick<
  CreditAssessment,
  | "isEligible"
  | "meetsAgeRequirement"
  | "meetsForeignerIncomeFloor"
  | "maxEligibleLoan"
  | "existingLoans"
> = {
  isEligible: false,
  meetsAgeRequirement: true,
  meetsForeignerIncomeFloor: true,
  maxEligibleLoan: 0,
  existingLoans: 0,
};

describe("deriveCreditRejectionReason", () => {
  it("returns null when eligible", () => {
    expect(deriveCreditRejectionReason({ ...BASE, isEligible: true, maxEligibleLoan: 5000 })).toBeNull();
  });

  it("prioritises under_18", () => {
    expect(
      deriveCreditRejectionReason({
        ...BASE,
        meetsAgeRequirement: false,
        meetsForeignerIncomeFloor: false,
      }),
    ).toBe("under_18");
  });

  it("returns foreigner_income_floor", () => {
    expect(
      deriveCreditRejectionReason({ ...BASE, meetsForeignerIncomeFloor: false }),
    ).toBe("foreigner_income_floor");
  });

  it("returns zero_cap_moneylender_os when O/S present", () => {
    expect(
      deriveCreditRejectionReason({ ...BASE, existingLoans: 5000 }),
    ).toBe("zero_cap_moneylender_os");
  });

  it("returns zero_cap_income_too_low when no O/S", () => {
    expect(deriveCreditRejectionReason({ ...BASE })).toBe("zero_cap_income_too_low");
  });

  it("has a label for every code", () => {
    const codes = [
      "under_18",
      "foreigner_income_floor",
      "zero_cap_moneylender_os",
      "zero_cap_income_too_low",
    ] as const;
    for (const code of codes) {
      expect(creditRejectionLabel(code)).toBeTruthy();
    }
  });
});
