/**
 * Shaping helpers for the AXS partner API response.
 *
 * Kept out of the route module so they can be unit tested: `partnerNotes` is
 * the boundary that stops internal credit reasoning reaching the partner, and
 * that guarantee is worth a test.
 */

/**
 * Rejections AXS should act on themselves: the applicant is already our
 * customer, is blacklisted, or is under 18. These are identity facts that will
 * not change on a second look.
 *
 * Income-based declines are deliberately NOT here — those stay "pending" so
 * AXS still pass the customer on, and income is verified at the appointment.
 */
const HARD_REJECT_CODES = new Set([
  "airconnect_reloan",
  "airconnect_not_eligible",
  "under_18",
]);

/**
 * The `status` AXS receive: "rejected" means stop, "pending" means proceed to
 * an appointment (including an approval, which is pending until they book).
 */
export function partnerStatus(reason: string | null): "pending" | "rejected" {
  return reason && HARD_REJECT_CODES.has(reason) ? "rejected" : "pending";
}

/** True when the applicant must not be given a booking link at all. */
export function isHardReject(reason: string | null): boolean {
  return partnerStatus(reason) === "rejected";
}

/** Which H5 page the AXS customer lands on from `bookingUrl`. */
export type PartnerPage = "book" | "pending" | "rejected";

/**
 * The page rule agreed with the business:
 *   - rejected: a hard reject (existing borrower, blacklisted, under 18).
 *   - pending: any foreigner, whatever their income, because their documents
 *     are checked by hand and the customer advised before an appointment; and
 *     an SG/PR with no CPF or NOA in MyInfo.
 *   - book: an SG/PR with CPF or NOA.
 */
export function partnerPage(applicant: {
  reason: string | null;
  idType: string;
  hasCpfOrNoa: boolean;
}): PartnerPage {
  if (isHardReject(applicant.reason)) return "rejected";
  if (applicant.idType === "foreigner") return "pending";
  return applicant.hasCpfOrNoa ? "book" : "pending";
}

/**
 * The link AXS receive as `bookingUrl` for that page. Only "book" gets the
 * booking link; anyone else holding the URL cannot book with it.
 */
export function partnerLink(
  page: PartnerPage,
  links: { bookingUrl: string; pendingUrl: string; rejectedUrl: string },
): string {
  if (page === "rejected") return links.rejectedUrl;
  if (page === "pending") return links.pendingUrl;
  return links.bookingUrl;
}

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
  page: PartnerPage = "book",
): string {
  if (decision === "approved") {
    // A pending-page customer has no booking link, so don't tell them to book.
    return page === "pending"
      ? "Application received. Our team will review it and contact the customer to arrange an appointment."
      : "Approved. Proceed to book an appointment.";
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
      // Hard reject: AXS stop here, so this must not invite a booking. Their
      // link is the rejected page, which says the same.
      return "Existing customer. Please contact us directly.";
    default:
      // Covers airconnect_not_eligible and any future code — deliberately vague.
      return "Not eligible at this time.";
  }
}
