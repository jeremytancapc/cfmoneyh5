/**
 * The AXS booking webhook, in the format AXS specified. Sent when a customer
 * books, and again whenever AirConnect reports that the appointment moved, was
 * cancelled or was missed.
 *
 * Deliberately carries no customer name or phone number — AXS already holds
 * the applicant's details, and their schema has no field for them, so there is
 * no reason to send personal data across this boundary.
 *
 * `loan_reference_no` is always null: the loan does not exist yet at booking
 * time, it is only created once the customer is served at the branch.
 */

import { logExternalApi } from "@/lib/external-api-logger";

/** What the AXS app shows the customer. AXS accept exactly these values. */
export type AxsBookingStatus = "booked" | "rescheduled" | "cancelled" | "missed";

export interface AxsBookingWebhookPayload {
  axsRef: string;
  leadId: string;
  /** CFAXS-XXXXXXXX — goes out as metadata.booking_id */
  applicationRef: string;
  status: AxsBookingStatus;
  /** YYYY-MM-DD */
  appointmentDate: string;
  /** HH:MM or HH:MM:SS */
  appointmentTime: string;
  bookingLink: string;
  /** Label for api_logs, e.g. "[axs/book:webhook]" */
  logTag: string;
}

/** The customer's booking link for a signed AXS token. */
export function axsBookingLink(token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://apply.crawfort.com"}/axs/book?token=${token}`;
}

/** AXS expect HH:MM:SS; our booking UI posts HH:MM. */
export function toAxsTime(time: string): string {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

export function buildAxsBookingWebhookBody(payload: Omit<AxsBookingWebhookPayload, "leadId" | "logTag">) {
  return {
    loan_reference_no: null,
    reference_id: payload.axsRef,
    booking_date: payload.appointmentDate,
    booking_time: toAxsTime(payload.appointmentTime),
    booking_url: payload.bookingLink,
    status: payload.status,
    metadata: {
      booking_id: payload.applicationRef,
    },
  };
}

/**
 * Sends one webhook. Never throws; `ok` says whether AXS accepted it, so the
 * caller only records what AXS were told once they have actually been told.
 * A no-op (ok: false) until AXS_BOOKING_WEBHOOK_URL is set.
 */
export async function sendAxsBookingWebhook(payload: AxsBookingWebhookPayload): Promise<{ ok: boolean }> {
  const url = process.env.AXS_BOOKING_WEBHOOK_URL;

  if (!url) {
    console.warn(`${payload.logTag} AXS_BOOKING_WEBHOOK_URL not configured — skipping booking webhook`);
    return { ok: false };
  }

  const requestBody = buildAxsBookingWebhookBody(payload);

  const apiKey = process.env.AXS_BOOKING_WEBHOOK_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };

  if (!apiKey) {
    console.warn(`${payload.logTag} AXS_BOOKING_WEBHOOK_API_KEY not set — sending webhook unauthenticated`);
  }

  try {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15_000),
    });

    const ms = Date.now() - started;
    const responseBody = !res.ok ? await res.text() : undefined;

    logExternalApi({
      tag: payload.logTag,
      url,
      method: "POST",
      // Key redacted — logExternalApi writes to api_logs, which we read in chat.
      headers: { ...headers, ...(apiKey ? { "x-api-key": "***" } : {}) },
      body: requestBody,
      status: res.status,
      ok: res.ok,
      ms,
      responseBody,
      leadId: payload.leadId,
    });

    if (!res.ok) {
      console.error(`${payload.logTag} booking webhook failed`, { status: res.status, ms });
    }
    return { ok: res.ok };
  } catch (err) {
    console.error(`${payload.logTag} booking webhook error`, err);
    return { ok: false };
  }
}
