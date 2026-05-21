import type { CreditAssessment } from "./credit-score";

/**
 * System credit decline codes (internal / Looker only).
 * Not shown to applicants — distinct from leads.decline_reason (offer survey).
 */
export type CreditRejectionCode =
  | "under_18"
  | "foreigner_income_floor"
  | "zero_cap_moneylender_os"
  | "zero_cap_income_too_low";

const REJECTION_LABELS: Record<CreditRejectionCode, string> = {
  under_18: "Under 18",
  foreigner_income_floor: "Foreigner income below minimum",
  zero_cap_moneylender_os: "Cap zero — moneylender O/S",
  zero_cap_income_too_low: "Cap zero — income too low",
};

/** Derive system credit rejection from assessCredit output. Returns null when approved. */
export function deriveCreditRejectionReason(
  assessment: Pick<
    CreditAssessment,
    | "isEligible"
    | "meetsAgeRequirement"
    | "meetsForeignerIncomeFloor"
    | "maxEligibleLoan"
    | "existingLoans"
  >,
): CreditRejectionCode | null {
  if (assessment.isEligible) return null;

  if (!assessment.meetsAgeRequirement) return "under_18";
  if (!assessment.meetsForeignerIncomeFloor) return "foreigner_income_floor";
  if (assessment.maxEligibleLoan <= 0) {
    return assessment.existingLoans > 0
      ? "zero_cap_moneylender_os"
      : "zero_cap_income_too_low";
  }

  return "zero_cap_income_too_low";
}

export function creditRejectionLabel(code: CreditRejectionCode | null | undefined): string | null {
  if (!code) return null;
  return REJECTION_LABELS[code];
}
