/**
 * Tests for AXS partner response shaping.
 *
 * The important assertions here are negative: the partner must never receive
 * our capacity multiplier, internal lead IDs, or the name of an internal system.
 */

import { describe, it, expect } from "vitest";
import { partnerNotes, round2 } from "./axs-response";

describe("round2", () => {
  it("trims float artefacts from a loan cap", () => {
    expect(round2(54218.181818181816)).toBe(54218.18);
  });

  it("trims float artefacts from monthly income", () => {
    expect(round2(12048.484848484848)).toBe(12048.48);
  });

  it("leaves whole numbers alone", () => {
    expect(round2(20000)).toBe(20000);
    expect(round2(0)).toBe(0);
  });

  it("rounds half up rather than down", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it("never returns more than 2 decimal places", () => {
    for (const n of [1 / 3, 2 / 3, 1988 / 0.165, 100900 / 12]) {
      const s = String(round2(n));
      const dp = s.includes(".") ? s.split(".")[1].length : 0;
      expect(dp).toBeLessThanOrEqual(2);
    }
  });
});

describe("partnerNotes", () => {
  const ALL_REASONS = [
    "under_18",
    "foreigner_income_floor",
    "zero_cap_moneylender_os",
    "zero_cap_income_too_low",
    "below_min_loan_amount",
    "airconnect_not_eligible",
    "airconnect_reloan",
    null,
    "some_future_code",
  ];

  it("gives an approved applicant a next step", () => {
    expect(partnerNotes("approved", null)).toMatch(/book an appointment/i);
  });

  it("explains each rejection without naming the mechanism", () => {
    expect(partnerNotes("rejected", "foreigner_income_floor")).toBe(
      "Income does not meet the minimum requirement for non-residents.",
    );
    expect(partnerNotes("rejected", "zero_cap_moneylender_os")).toBe(
      "Existing loan commitments exceed available borrowing capacity.",
    );
  });

  it("falls back to vague wording for unknown codes", () => {
    expect(partnerNotes("rejected", "some_future_code")).toBe("Not eligible at this time.");
    expect(partnerNotes("rejected", null)).toBe("Not eligible at this time.");
  });

  it("never leaks the capacity multiplier or scoring internals", () => {
    for (const reason of ALL_REASONS) {
      for (const decision of ["approved", "rejected"] as const) {
        const notes = partnerNotes(decision, reason);
        expect(notes).not.toMatch(/capacity factor/i);
        expect(notes).not.toMatch(/4\.5|multiplier|×/i);
        expect(notes).not.toMatch(/CPF|NOA/);
      }
    }
  });

  it("never names an internal system or leaks internal lead IDs", () => {
    for (const reason of ALL_REASONS) {
      const notes = partnerNotes("rejected", reason);
      expect(notes).not.toMatch(/airconnect/i);
      expect(notes).not.toMatch(/exists in leads/i);
      expect(notes).not.toMatch(/\d{5,}/); // internal numeric lead IDs
    }
  });
});
