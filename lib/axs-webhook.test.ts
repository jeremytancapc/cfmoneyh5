/**
 * Tests for the AXS booking webhook body and the reapply-note masking.
 *
 * The important assertions are negative: AXS must never receive a name, phone
 * or NRIC, and api_logs must never hold a full identifier.
 */

import { describe, expect, it } from "vitest";
import { buildAxsBookingWebhookBody, toAxsTime } from "./axs-webhook";
import { maskLast4 } from "./airconnect-reapply-note";

describe("toAxsTime", () => {
  it("adds seconds to the booking UI's HH:MM", () => {
    expect(toAxsTime("14:30")).toBe("14:30:00");
  });

  it("leaves HH:MM:SS alone", () => {
    expect(toAxsTime("14:30:00")).toBe("14:30:00");
  });
});

describe("buildAxsBookingWebhookBody", () => {
  const base = {
    axsRef: "AXS25072100001",
    applicationRef: "CFAXS-728950E1",
    appointmentDate: "2026-11-03",
    appointmentTime: "14:30",
    bookingLink: "https://apply.crawfort.com/axs/book?token=abc.def",
  };

  it("keeps the shape AXS specified, with the status passed in", () => {
    for (const status of ["booked", "rescheduled", "cancelled", "missed"] as const) {
      expect(buildAxsBookingWebhookBody({ ...base, status })).toEqual({
        loan_reference_no: null,
        reference_id: "AXS25072100001",
        booking_date: "2026-11-03",
        booking_time: "14:30:00",
        booking_url: "https://apply.crawfort.com/axs/book?token=abc.def",
        status,
        metadata: { booking_id: "CFAXS-728950E1" },
      });
    }
  });

  it("carries no personal data and no internal lead id", () => {
    const json = JSON.stringify(buildAxsBookingWebhookBody({ ...base, status: "cancelled" }));
    for (const key of ["name", "phone", "mobile", "nric", "idNumber", "leadId", "lead_id"]) {
      expect(json).not.toContain(`"${key}"`);
    }
  });
});

describe("maskLast4", () => {
  it("keeps only the last four characters", () => {
    expect(maskLast4("S1234567D")).toBe("****567D");
    expect(maskLast4("+6591234567")).toBe("****4567");
  });

  it("gives nothing for nothing", () => {
    expect(maskLast4("")).toBe("");
  });
});
