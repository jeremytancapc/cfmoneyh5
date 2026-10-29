/**
 * Tests for AXS partner response shaping.
 *
 * The important assertions here are negative: the partner must never receive
 * our capacity multiplier, internal lead IDs, or the name of an internal system.
 */

import { describe, it, expect } from "vitest";
import { isHardReject, partnerDecision, partnerLink, partnerNotes, partnerPage, partnerStatus, round2 } from "./axs-response";

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

describe("partnerStatus", () => {
  it("hard-rejects an existing customer, a blacklisted one, and an under-18", () => {
    expect(partnerStatus("airconnect_reloan")).toBe("rejected");
    expect(partnerStatus("airconnect_not_eligible")).toBe("rejected");
    expect(partnerStatus("under_18")).toBe("rejected");
  });

  it("keeps every income-based decline as pending, since AXS re-check income", () => {
    for (const r of [
      "foreigner_income_floor",
      "zero_cap_income_too_low",
      "zero_cap_moneylender_os",
      "below_min_loan_amount",
    ]) {
      expect(partnerStatus(r)).toBe("pending");
    }
  });

  it("is pending when approved, and for an unknown code", () => {
    expect(partnerStatus(null)).toBe("pending");
    expect(partnerStatus("some_future_code")).toBe("pending");
  });

  it("isHardReject agrees with partnerStatus", () => {
    for (const r of ["under_18", "foreigner_income_floor", null, "airconnect_reloan"]) {
      expect(isHardReject(r)).toBe(partnerStatus(r) === "rejected");
    }
  });
});

describe("partnerDecision", () => {
  it("rejects with a reason only for an existing customer, a blacklisted one, and an under-18", () => {
    for (const r of ["airconnect_reloan", "airconnect_not_eligible", "under_18"]) {
      expect(partnerDecision(r)).toEqual({ decision: "rejected", reason: r });
    }
  });

  it("never rejects on income, and sends no income reason code", () => {
    for (const r of ["foreigner_income_floor", "zero_cap_income_too_low", "zero_cap_moneylender_os", "below_min_loan_amount", "some_future_code", null]) {
      expect(partnerDecision(r)).toEqual({ decision: "approved", reason: null });
    }
  });

  it("agrees with partnerStatus", () => {
    for (const r of ["under_18", "foreigner_income_floor", null, "airconnect_reloan"]) {
      expect(partnerDecision(r).decision === "rejected").toBe(partnerStatus(r) === "rejected");
    }
  });
});

describe("partnerPage", () => {
  const HARD = ["airconnect_reloan", "airconnect_not_eligible", "under_18"];

  it("books an SG or PR with CPF or NOA", () => {
    for (const idType of ["singaporean", "pr"]) {
      expect(partnerPage({ reason: null, idType, hasCpfOrNoa: true })).toBe("book");
      // An income-based decline still books: income is re-checked in branch.
      expect(partnerPage({ reason: "zero_cap_income_too_low", idType, hasCpfOrNoa: true })).toBe("book");
    }
  });

  it("sends an SG or PR with no CPF and no NOA to the pending page", () => {
    for (const idType of ["singaporean", "pr"]) {
      expect(partnerPage({ reason: null, idType, hasCpfOrNoa: false })).toBe("pending");
    }
  });

  it("sends every foreigner to the pending page, whatever their income", () => {
    for (const hasCpfOrNoa of [true, false]) {
      for (const reason of [null, "foreigner_income_floor"]) {
        expect(partnerPage({ reason, idType: "foreigner", hasCpfOrNoa })).toBe("pending");
      }
    }
  });

  it("sends every hard reject to the rejected page, even with CPF", () => {
    for (const reason of HARD) {
      for (const idType of ["singaporean", "pr", "foreigner"]) {
        expect(partnerPage({ reason, idType, hasCpfOrNoa: true })).toBe("rejected");
      }
    }
  });
});

describe("partnerLink", () => {
  const links = {
    bookingUrl: "https://apply-dev.crawfort.com/axs/book?token=abc.def",
    pendingUrl: "https://apply-dev.crawfort.com/axs/pending?leadId=0f8fad5b-d9cb-469f-a165-70867728950e",
    rejectedUrl: "https://apply-dev.crawfort.com/axs/rejected",
  };

  it("gives the booking link only to a book page", () => {
    expect(partnerLink("book", links)).toBe(links.bookingUrl);
    expect(partnerLink("pending", links)).toBe(links.pendingUrl);
    expect(partnerLink("rejected", links)).toBe(links.rejectedUrl);
  });

  it("never gives a hard reject the booking link", () => {
    for (const r of ["airconnect_reloan", "airconnect_not_eligible", "under_18"]) {
      const page = partnerPage({ reason: r, idType: "singaporean", hasCpfOrNoa: true });
      expect(partnerLink(page, links)).toBe(links.rejectedUrl);
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
  const PAGES = ["book", "pending", "rejected"] as const;
  const REVIEW = /our team will review it and contact the customer/i;

  it("gives an approved applicant a next step", () => {
    expect(partnerNotes("approved", null, "book")).toMatch(/book an appointment/i);
  });

  it("does not tell an approved pending-page applicant to book", () => {
    // A foreigner or an SG/PR without CPF/NOA has no booking link.
    expect(partnerNotes("approved", null, "pending")).not.toMatch(/book an appointment/i);
    expect(partnerNotes("approved", null, "pending")).toMatch(REVIEW);
  });

  it("does not invite a hard-rejected applicant to book", () => {
    // They get no booking link, so the copy must not tell them to book.
    for (const r of ["airconnect_reloan", "airconnect_not_eligible", "under_18"]) {
      expect(partnerNotes("rejected", r, "rejected")).not.toMatch(/book an appointment/i);
    }
  });

  it("explains each hard reject without naming the mechanism", () => {
    expect(partnerNotes("rejected", "under_18", "rejected")).toBe(
      "Applicant does not meet the minimum age requirement.",
    );
    expect(partnerNotes("rejected", "airconnect_reloan", "rejected")).toBe(
      "Existing customer. Please contact us directly.",
    );
    expect(partnerNotes("rejected", "airconnect_not_eligible", "rejected")).toBe("Not eligible at this time.");
  });

  it("gives a foreigner below the income floor the same review wording as any pending-page customer", () => {
    expect(partnerNotes("rejected", "foreigner_income_floor", "pending")).toBe(
      partnerNotes("approved", null, "pending"),
    );
  });

  it("never tells an income-based decline it is not eligible", () => {
    // Income is checked again by our team, so these are not rejections to AXS.
    for (const r of ["foreigner_income_floor", "zero_cap_moneylender_os", "zero_cap_income_too_low", "below_min_loan_amount", "some_future_code"]) {
      for (const page of ["book", "pending"] as const) {
        const notes = partnerNotes("rejected", r, page);
        expect(notes).not.toMatch(/not eligible|does not meet|exceed|below/i);
        expect(notes).toMatch(page === "pending" ? REVIEW : /book an appointment/i);
      }
    }
  });

  it("never leaks the capacity multiplier or scoring internals", () => {
    for (const reason of ALL_REASONS) {
      for (const decision of ["approved", "rejected"] as const) {
        for (const page of PAGES) {
          const notes = partnerNotes(decision, reason, page);
          expect(notes).not.toMatch(/capacity factor/i);
          expect(notes).not.toMatch(/4\.5|multiplier|×/i);
          expect(notes).not.toMatch(/CPF|NOA/);
        }
      }
    }
  });

  it("never names an internal system or leaks internal lead IDs", () => {
    for (const reason of ALL_REASONS) {
      for (const page of PAGES) {
        const notes = partnerNotes("rejected", reason, page);
        expect(notes).not.toMatch(/airconnect/i);
        expect(notes).not.toMatch(/exists in leads/i);
        expect(notes).not.toMatch(/\d{5,}/); // internal numeric lead IDs
      }
    }
  });
});
