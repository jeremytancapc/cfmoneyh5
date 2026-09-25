/**
 * Shaping helpers for the AXS partner API response.
 *
 * Kept out of the route module so they can be unit tested: `partnerNotes` is
 * the boundary that stops internal credit reasoning reaching the partner, and
 * that guarantee is worth a test.
 */

/** Money and income are rendered in a partner UI — don't leak raw float precision. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Partner-safe wording for the response `notes` field.
 *
 * Two internal strings must never go out over this API:
 *   - assessment.explanation states the capacity multiplier, which together
 *     with verifiedMonthlyIncome reconstructs the whole scoring formula.
 *   - eligibility.notes carries internal lead IDs and names an internal system.
 *
 * Both are still persisted for our own reporting — credit_assessments.explanation
 * and leads.eligibility_notes are written unchanged.
 */
export function partnerNotes(
  decision: "approved" | "rejected",
  reason: string | null,
): string {
  if (decision === "approved") {
    return "Approved. Proceed to book an appointment.";
  }

  switch (reason) {
    case "under_18":
      return "Applicant does not meet the minimum age requirement.";
    case "foreigner_income_floor":
      return "Income does not meet the minimum requirement for non-residents.";
    case "zero_cap_moneylender_os":
      return "Existing loan commitments exceed available borrowing capacity.";
    case "zero_cap_income_too_low":
      return "Income does not meet the minimum requirement.";
    case "below_min_loan_amount":
      return "Eligible amount is below our minimum loan size.";
    case "airconnect_reloan":
      return "Existing customer. Proceed to book an appointment.";
    default:
      // Covers airconnect_not_eligible and any future code — deliberately vague.
      return "Not eligible at this time.";
  }
}
