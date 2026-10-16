/**
 * Credit-limit fields sent to AirConnect alongside a booking.
 *
 * AirConnect records every credit limit it is told about, with its source and
 * when it was decided, and shows the latest on the lead. V2 reports Ascend's
 * limit; this is V1 reporting its own, so the provider is "crawfort" and never
 * "ascend".
 *
 * The fields are optional on AirConnect's side: when V1 produced no limit we
 * send none of them and the request behaves exactly as it did before. Built
 * here rather than inline so the "never send a zero, never claim a limit we
 * do not have" rules live in one tested place.
 */

/** AirConnect rejects anything above this. */
export const MAX_CREDIT_LIMIT = 10_000_000;

/** AirConnect truncates beyond this; we refuse to send a mangled reference. */
const MAX_REFERENCE_CHARS = 100;

export interface CreditLimitFields {
  creditLimit: number;
  creditLimitSource: "cf_h5_v1";
  creditLimitProvider: "crawfort";
  creditLimitReference: string;
  creditLimitDecidedAt: string;
}

/**
 * Returns the fields to merge into the AirConnect payload, or null when there
 * is nothing credible to report — in which case the caller must send none of
 * them rather than sending partial or zero values.
 */
export function buildCreditLimitFields(input: {
  /** credit_assessments.approved_loan_amount */
  approvedLoanAmount: number | string | null | undefined;
  /** credit_assessments.created_at — when V1 computed the limit */
  decidedAt: string | null | undefined;
  /** Our own application ref, e.g. CFH5-A1B2C3D4 */
  applicationRef: string | null | undefined;
}): CreditLimitFields | null {
  const amount = Number(input.approvedLoanAmount);

  // Declined, unscored, or unparseable — there is no limit to report.
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Out of AirConnect's accepted range. Clamping would report a limit we never
  // decided, so say nothing instead.
  if (amount > MAX_CREDIT_LIMIT) return null;

  const reference = (input.applicationRef ?? "").trim();
  if (!reference || reference.length > MAX_REFERENCE_CHARS) return null;

  // Without a decision time we cannot honestly state when the limit was set.
  if (!input.decidedAt) return null;
  const decided = new Date(input.decidedAt);
  if (Number.isNaN(decided.getTime())) return null;

  return {
    creditLimit: amount,
    creditLimitSource: "cf_h5_v1",
    creditLimitProvider: "crawfort",
    creditLimitReference: reference,
    creditLimitDecidedAt: decided.toISOString(),
  };
}
