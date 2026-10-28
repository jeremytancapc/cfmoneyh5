/**
 * How an appointment event from AirConnect changes an AXS booking.
 *
 * After an AXS customer books, agents take over in AirConnect. AirConnect then
 * tells us (POST /api/airconnect/appointment-event) when it creates, moves,
 * cancels, misses or completes the appointment, and this decides two things:
 * what our own appointment row becomes, and what — if anything — AXS is told.
 *
 * Pure: no database, no network, so every rule is unit-tested on its own.
 */

import type { AxsBookingStatus } from "@/lib/axs-webhook";

/**
 * Statuses that hold the one-booking-per-application lock. A cancel or a miss
 * frees the booking link to book again; a completed visit keeps it closed — a
 * new loan goes back through AXS for a fresh assessment.
 */
export const BOOKING_LOCK_STATUSES = ["confirmed", "completed"];

export type AirConnectAppointmentEvent = "created" | "moved" | "cancelled" | "missed" | "done";

export const AIRCONNECT_APPOINTMENT_EVENTS: readonly AirConnectAppointmentEvent[] = [
  "created",
  "moved",
  "cancelled",
  "missed",
  "done",
];

export interface IncomingAppointmentEvent {
  event: AirConnectAppointmentEvent;
  /** AirConnect's appointment id. */
  appointmentId: number;
  /** ISO 8601 (UTC) start of the AirConnect appointment. */
  startDatetime: string;
}

/** Our latest appointment row for the lead, as far as this decision needs it. */
export interface LocalAppointment {
  id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  airconnect_appointment_id: number | null;
  axs_notified_status: string | null;
}

export interface SlotSgt {
  /** YYYY-MM-DD, Singapore */
  date: string;
  /** HH:MM, 24h, Singapore */
  time: string;
}

export type LocalChange =
  | { kind: "none" }
  | { kind: "update"; id: string; fields: Record<string, unknown> }
  | { kind: "insert"; fields: Record<string, unknown> };

export interface AxsMessage {
  status: AxsBookingStatus;
  date: string;
  time: string;
}

export interface Decision {
  local: LocalChange;
  /** Null when AXS has nothing new to hear. */
  axs: AxsMessage | null;
  /** One line for the log: why this decision. */
  reason: string;
}

/** AirConnect stores UTC; AXS and our rows use Singapore wall time. */
export function toSingaporeSlot(isoUtc: string): SlotSgt | null {
  const at = new Date(isoUtc);
  if (Number.isNaN(at.getTime())) return null;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  return { date, time };
}

function sameSlot(local: LocalAppointment, slot: SlotSgt): boolean {
  return (
    String(local.appointment_date) === slot.date &&
    String(local.appointment_time ?? "").slice(0, 5) === slot.time
  );
}

const ACTIVE = "confirmed";
const COMPLETED = "completed";
const nothing = (reason: string): Decision => ({ local: { kind: "none" }, axs: null, reason });

/**
 * Decides what an event means for our row and for AXS.
 *
 * - created / moved: the customer now holds this AirConnect slot. Our active
 *   row takes it over; if we have none (it was cancelled or missed, or there
 *   never was one), a new confirmed row is made. AXS hears "booked" (created)
 *   or "rescheduled" (moved) — unless they were already told exactly that.
 *   Ignored once the booking is completed.
 * - cancelled / missed: our active row follows and AXS hears it, with the
 *   booking link so the customer can rebook. Ignored for an AirConnect
 *   appointment other than the one our row mirrors (an earlier one of the same
 *   booking, e.g. cancelled after a newer one was made), and when our row
 *   already says so.
 * - done: our row becomes completed from any state, for any appointment of
 *   this booking, and the link closes. AXS is not told.
 */
export function decideAxsEvent(local: LocalAppointment | null, incoming: IncomingAppointmentEvent): Decision {
  const slot = toSingaporeSlot(incoming.startDatetime);
  if (!slot) return nothing(`unreadable startDatetime "${incoming.startDatetime}"`);

  if (incoming.event === "created" || incoming.event === "moved") {
    // The visit already happened and the application is closed; a later
    // appointment on the same lead is not this booking's.
    if (local?.status === COMPLETED) return nothing(`${incoming.event}: booking already completed`);

    const axsStatus: AxsBookingStatus = incoming.event === "created" ? "booked" : "rescheduled";
    const slotFields = {
      appointment_date: slot.date,
      appointment_time: slot.time,
      airconnect_appointment_id: incoming.appointmentId,
    };

    if (local?.status === ACTIVE) {
      const alreadyTold = local.axs_notified_status === axsStatus && sameSlot(local, slot);
      return {
        local: { kind: "update", id: local.id, fields: slotFields },
        axs: alreadyTold ? null : { status: axsStatus, ...slot },
        reason: alreadyTold
          ? `${incoming.event}: AXS already has ${axsStatus} for this slot`
          : `${incoming.event}: active row takes the AirConnect slot`,
      };
    }

    return {
      local: { kind: "insert", fields: { ...slotFields, status: ACTIVE } },
      axs: { status: axsStatus, ...slot },
      reason: `${incoming.event}: no active row (${local?.status ?? "none"}), booked again by an agent`,
    };
  }

  if (!local) return nothing(`${incoming.event}: no appointment row for this lead`);

  // They visited. AirConnect only reports appointments made since this booking,
  // so whichever one it was — a late arrival on a row already marked missed or
  // cancelled, or a walk-in the branch sheet recorded as a new appointment — the
  // booking is done and its link closes.
  if (incoming.event === "done") {
    if (local.status === COMPLETED) return nothing("done: row is already completed");
    return {
      local: {
        kind: "update",
        id: local.id,
        fields: { airconnect_appointment_id: incoming.appointmentId, status: COMPLETED },
      },
      axs: null,
      reason: `done: visit completed (was ${local.status}), AXS not told`,
    };
  }

  if (local.airconnect_appointment_id !== null && local.airconnect_appointment_id !== incoming.appointmentId) {
    return nothing(
      `${incoming.event}: for AirConnect appointment ${incoming.appointmentId}, our row mirrors ${local.airconnect_appointment_id}`,
    );
  }

  if (local.status !== ACTIVE) {
    return nothing(`${incoming.event}: row is already ${local.status}`);
  }

  const linked = { airconnect_appointment_id: incoming.appointmentId };

  const isCancel = incoming.event === "cancelled";
  return {
    local: {
      kind: "update",
      id: local.id,
      fields: {
        ...linked,
        status: incoming.event,
        ...(isCancel ? { cancelled_at: new Date().toISOString(), cancellation_reason: "Cancelled in AirConnect" } : {}),
      },
    },
    // The slot AXS last knew about, so their record reads "cancelled/missed: <that slot>".
    axs: {
      status: incoming.event,
      date: String(local.appointment_date),
      time: String(local.appointment_time ?? "").slice(0, 5),
    },
    reason: `${incoming.event}: booking link reopened`,
  };
}
