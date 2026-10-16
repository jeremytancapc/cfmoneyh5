/**
 * Tests for the AirConnect credit-limit fields.
 *
 * The rules that matter are the refusals: a zero or negative limit must never
 * be sent, and we must never claim a limit we cannot substantiate.
 */

import { describe, it, expect } from "vitest";
import { buildCreditLimitFields, MAX_CREDIT_LIMIT } from "./airconnect-credit-limit";

const OK = {
  approvedLoanAmount: 5000,
  decidedAt: "2026-10-16T04:40:35.000Z",
  applicationRef: "CFH5-A1B2C3D4",
};

describe("buildCreditLimitFields", () => {
  it("builds the payload AirConnect specified", () => {
    expect(buildCreditLimitFields(OK)).toEqual({
      creditLimit: 5000,
      creditLimitSource: "cf_h5_v1",
      creditLimitProvider: "crawfort",
      creditLimitReference: "CFH5-A1B2C3D4",
      creditLimitDecidedAt: "2026-10-16T04:40:35.000Z",
    });
  });

  it("never reports us as ascend", () => {
    const fields = buildCreditLimitFields(OK)!;
    expect(fields.creditLimitProvider).toBe("crawfort");
    expect(fields.creditLimitProvider).not.toBe("ascend");
  });

  it("sends nothing for a declined applicant", () => {
    // approved_loan_amount is 0 on every rejection — the most common case.
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: 0 })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: -1 })).toBeNull();
  });

  it("sends nothing when there is no assessment at all", () => {
    // AIP leads have no credit_assessments row.
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: null })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: undefined })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: "not-a-number" })).toBeNull();
  });

  it("refuses rather than clamps an out-of-range limit", () => {
    // Clamping would report a limit we never decided.
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: MAX_CREDIT_LIMIT })).not.toBeNull();
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: MAX_CREDIT_LIMIT + 1 })).toBeNull();
  });

  it("refuses without a usable decision time", () => {
    expect(buildCreditLimitFields({ ...OK, decidedAt: null })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, decidedAt: "" })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, decidedAt: "nonsense" })).toBeNull();
  });

  it("normalises the decision time to ISO 8601 UTC", () => {
    const fields = buildCreditLimitFields({
      ...OK,
      decidedAt: "2026-10-16T12:40:35+08:00",
    })!;
    expect(fields.creditLimitDecidedAt).toBe("2026-10-16T04:40:35.000Z");
  });

  it("refuses a missing or oversized reference", () => {
    expect(buildCreditLimitFields({ ...OK, applicationRef: null })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, applicationRef: "  " })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, applicationRef: "C".repeat(101) })).toBeNull();
    expect(buildCreditLimitFields({ ...OK, applicationRef: "C".repeat(100) })).not.toBeNull();
  });

  it("accepts a string amount, as PostgREST returns numerics", () => {
    expect(buildCreditLimitFields({ ...OK, approvedLoanAmount: "3000.00" })?.creditLimit).toBe(3000);
  });
});
