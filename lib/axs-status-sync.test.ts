/**
 * Tests for how AirConnect appointment events change an AXS booking.
 *
 * What matters most: AXS is told each change exactly once, a cancel or miss
 * reopens the booking link, a completed visit does not, and an event for some
 * other AirConnect appointment on a reused lead changes nothing.
 */

import { describe, expect, it } from "vitest";
import { decideAxsEvent, toSingaporeSlot, type LocalAppointment } from "./axs-status-sync";

// 2026-11-03 14:30 Singapore
const START_UTC = "2026-11-03T06:30:00.000Z";

function row(overrides: Partial<LocalAppointment> = {}): LocalAppointment {
  return {
    id: "appt-1",
    status: "confirmed",
    appointment_date: "2026-11-03",
    appointment_time: "14:30:00",
    airconnect_appointment_id: null,
    axs_notified_status: "booked",
    ...overrides,
  };
}

describe("toSingaporeSlot", () => {
  it("converts AirConnect's UTC to Singapore wall time", () => {
    expect(toSingaporeSlot(START_UTC)).toEqual({ date: "2026-11-03", time: "14:30" });
  });

  it("rolls over to the next Singapore day", () => {
    expect(toSingaporeSlot("2026-11-03T17:00:00Z")).toEqual({ date: "2026-11-04", time: "01:00" });
  });

  it("gives nothing for an unreadable date", () => {
    expect(toSingaporeSlot("not a date")).toBeNull();
  });
});

describe("created", () => {
  it("stays quiet when the agent booked the slot the customer picked", () => {
    const d = decideAxsEvent(row(), { event: "created", appointmentId: 77, startDatetime: START_UTC });
    expect(d.axs).toBeNull();
    // Still links our row to AirConnect's appointment.
    expect(d.local).toEqual({
      kind: "update",
      id: "appt-1",
      fields: { appointment_date: "2026-11-03", appointment_time: "14:30", airconnect_appointment_id: 77 },
    });
  });

  it("tells AXS 'booked' with the agent's slot when it differs", () => {
    const d = decideAxsEvent(row(), { event: "created", appointmentId: 77, startDatetime: "2026-11-05T02:00:00Z" });
    expect(d.axs).toEqual({ status: "booked", date: "2026-11-05", time: "10:00" });
    expect(d.local.kind).toBe("update");
  });

  it("makes a new confirmed row after a cancel, and tells AXS 'booked'", () => {
    const d = decideAxsEvent(row({ status: "cancelled", axs_notified_status: "cancelled" }), {
      event: "created",
      appointmentId: 90,
      startDatetime: START_UTC,
    });
    expect(d.local).toEqual({
      kind: "insert",
      fields: { appointment_date: "2026-11-03", appointment_time: "14:30", airconnect_appointment_id: 90, status: "confirmed" },
    });
    expect(d.axs).toEqual({ status: "booked", date: "2026-11-03", time: "14:30" });
  });

  it("makes a row even when we never had one", () => {
    const d = decideAxsEvent(null, { event: "created", appointmentId: 90, startDatetime: START_UTC });
    expect(d.local.kind).toBe("insert");
    expect(d.axs?.status).toBe("booked");
  });
});

describe("moved", () => {
  it("tells AXS 'rescheduled' with the new slot", () => {
    const d = decideAxsEvent(row({ airconnect_appointment_id: 77 }), {
      event: "moved",
      appointmentId: 78,
      startDatetime: "2026-11-06T01:30:00Z",
    });
    expect(d.axs).toEqual({ status: "rescheduled", date: "2026-11-06", time: "09:30" });
    expect(d.local).toEqual({
      kind: "update",
      id: "appt-1",
      fields: { appointment_date: "2026-11-06", appointment_time: "09:30", airconnect_appointment_id: 78 },
    });
  });

  it("sends nothing when the same move arrives twice", () => {
    const d = decideAxsEvent(
      row({
        appointment_date: "2026-11-06",
        appointment_time: "09:30:00",
        airconnect_appointment_id: 78,
        axs_notified_status: "rescheduled",
      }),
      { event: "moved", appointmentId: 78, startDatetime: "2026-11-06T01:30:00Z" },
    );
    expect(d.axs).toBeNull();
  });

  it("resends when AXS never accepted the last attempt", () => {
    const d = decideAxsEvent(
      row({ appointment_date: "2026-11-06", appointment_time: "09:30:00", airconnect_appointment_id: 78, axs_notified_status: "booked" }),
      { event: "moved", appointmentId: 78, startDatetime: "2026-11-06T01:30:00Z" },
    );
    expect(d.axs?.status).toBe("rescheduled");
  });
});

describe("cancelled and missed", () => {
  for (const event of ["cancelled", "missed"] as const) {
    it(`${event}: our row follows and AXS hears it for the slot they knew`, () => {
      const d = decideAxsEvent(row({ airconnect_appointment_id: 77 }), { event, appointmentId: 77, startDatetime: START_UTC });
      expect(d.axs).toEqual({ status: event, date: "2026-11-03", time: "14:30" });
      expect(d.local.kind).toBe("update");
      if (d.local.kind === "update") expect(d.local.fields.status).toBe(event);
    });

    it(`${event}: ignored for a different AirConnect appointment on the same lead`, () => {
      const d = decideAxsEvent(row({ airconnect_appointment_id: 77 }), { event, appointmentId: 12, startDatetime: START_UTC });
      expect(d).toMatchObject({ local: { kind: "none" }, axs: null });
    });

    it(`${event}: sent once — a repeat finds the row already closed`, () => {
      const d = decideAxsEvent(row({ status: event, airconnect_appointment_id: 77 }), {
        event,
        appointmentId: 77,
        startDatetime: START_UTC,
      });
      expect(d).toMatchObject({ local: { kind: "none" }, axs: null });
    });
  }

  it("accepts the first event for a row not yet linked to AirConnect", () => {
    const d = decideAxsEvent(row({ airconnect_appointment_id: null }), { event: "missed", appointmentId: 77, startDatetime: START_UTC });
    expect(d.axs?.status).toBe("missed");
    if (d.local.kind === "update") expect(d.local.fields.airconnect_appointment_id).toBe(77);
  });

  it("records when and why a cancel happened", () => {
    const d = decideAxsEvent(row({ airconnect_appointment_id: 77 }), { event: "cancelled", appointmentId: 77, startDatetime: START_UTC });
    if (d.local.kind !== "update") throw new Error("expected an update");
    expect(typeof d.local.fields.cancelled_at).toBe("string");
    expect(d.local.fields.cancellation_reason).toBe("Cancelled in AirConnect");
  });

  it("does nothing without a row", () => {
    expect(decideAxsEvent(null, { event: "cancelled", appointmentId: 77, startDatetime: START_UTC }).local.kind).toBe("none");
  });
});

describe("done", () => {
  it("completes our row and keeps AXS out of it", () => {
    const d = decideAxsEvent(row({ airconnect_appointment_id: 77 }), { event: "done", appointmentId: 77, startDatetime: START_UTC });
    expect(d.axs).toBeNull();
    expect(d.local).toEqual({ kind: "update", id: "appt-1", fields: { airconnect_appointment_id: 77, status: "completed" } });
  });

  for (const earlier of ["missed", "cancelled"]) {
    it(`closes the link when a ${earlier} customer turns up after all`, () => {
      const d = decideAxsEvent(row({ status: earlier, airconnect_appointment_id: 77 }), {
        event: "done",
        appointmentId: 77,
        startDatetime: START_UTC,
      });
      expect(d.local).toEqual({ kind: "update", id: "appt-1", fields: { airconnect_appointment_id: 77, status: "completed" } });
      expect(d.axs).toBeNull();
    });
  }

  it("completes on a walk-in recorded as a different AirConnect appointment", () => {
    const d = decideAxsEvent(row({ airconnect_appointment_id: 77 }), { event: "done", appointmentId: 95, startDatetime: START_UTC });
    expect(d.local).toEqual({ kind: "update", id: "appt-1", fields: { airconnect_appointment_id: 95, status: "completed" } });
  });

  it("sends nothing twice", () => {
    const d = decideAxsEvent(row({ status: "completed", airconnect_appointment_id: 77 }), {
      event: "done",
      appointmentId: 77,
      startDatetime: START_UTC,
    });
    expect(d).toMatchObject({ local: { kind: "none" }, axs: null });
  });
});

describe("after completion", () => {
  for (const event of ["created", "moved"] as const) {
    it(`${event}: a later appointment does not reopen the booking or reach AXS`, () => {
      const d = decideAxsEvent(row({ status: "completed", airconnect_appointment_id: 77 }), {
        event,
        appointmentId: 120,
        startDatetime: START_UTC,
      });
      expect(d).toMatchObject({ local: { kind: "none" }, axs: null });
    });
  }
});

describe("an undone cancel arrives as created", () => {
  it("re-opens a confirmed row for the same appointment and tells AXS 'booked'", () => {
    const d = decideAxsEvent(row({ status: "cancelled", airconnect_appointment_id: 77, axs_notified_status: "cancelled" }), {
      event: "created",
      appointmentId: 77,
      startDatetime: START_UTC,
    });
    expect(d.local.kind).toBe("insert");
    expect(d.axs).toEqual({ status: "booked", date: "2026-11-03", time: "14:30" });
  });
});
