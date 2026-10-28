/**
 * POST /api/axs/book
 *
 * Books an appointment for an AXS customer.
 * Validates the signed token, then saves the appointment + notifies AirConnect.
 *
 * Body: { date: "YYYY-MM-DD", time: "HH:MM", token: "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { verifyAxsToken } from "@/lib/axs-token";
import { logExternalApi } from "@/lib/external-api-logger";
import { axsApplicationRef, cfh5ApplicationRef } from "@/lib/lead-id";
import { buildCreditLimitFields, type CreditLimitFields } from "@/lib/airconnect-credit-limit";
import { axsBookingLink, sendAxsBookingWebhook } from "@/lib/axs-webhook";
import { BOOKING_LOCK_STATUSES } from "@/lib/axs-status-sync";

export const runtime = "nodejs";

const LOG = "[axs/book]";

type Body = { date: string; time: string; token: string };

async function notifyAirConnect(payload: {
  customerName: string;
  phoneNumber: string;
  appointmentDate: string;
  timeSlot: string;
  leadId: string;
  loanAmount: number;
  idNumber?: string;
  axsRef?: string;
  /** V1's own credit limit, omitted entirely when we produced none. */
  creditLimit?: CreditLimitFields | null;
}) {
  const apiKey = process.env.AIRCONNECT_API_KEY;
  // AXS has its own AirConnect endpoint (/api/appointments/axs): it credits the
  // lead to AXS and links it to this application so AirConnect can report
  // appointment changes back. Deliberately no fallback to the shared
  // AIRCONNECT_APPOINTMENTS_URL — that would quietly create AXS leads AirConnect
  // can never report on.
  const url = process.env.AIRCONNECT_AXS_APPOINTMENTS_URL;

  if (!apiKey || !url) {
    console.warn(`${LOG} AirConnect AXS env not configured — skipping notification`);
    return;
  }

  // AirConnect has keyed on the CFH5- form since before AXS existed, so this
  // payload deliberately keeps that prefix while everything customer-facing
  // moved to CFAXS-. The 8-char suffix is identical either way, so a search on
  // the suffix still finds the same lead in both systems.
  const cfh5Id = cfh5ApplicationRef(payload.leadId);

  try {
    const bookingUrl = new URL(url);
    bookingUrl.searchParams.set("cfh5Id", cfh5Id);
    bookingUrl.searchParams.set("loanAmount", String(payload.loanAmount));
    bookingUrl.searchParams.set("leadId", payload.leadId);

    const headers: Record<string, string> = {
      apikey: apiKey,
      "Content-Type": "application/json",
    };

    const requestBody = {
      app: "dashboard",
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      appointmentDate: payload.appointmentDate,
      timeSlot: payload.timeSlot,
      cfh5Id,
      leadId: payload.leadId,
      loanAmount: payload.loanAmount,
      source: "axs",
      ...(payload.idNumber ? { idNumber: payload.idNumber } : {}),
      ...(payload.axsRef ? { axsRef: payload.axsRef } : {}),
      // Spread or nothing — a partial set would misreport the limit.
      ...(payload.creditLimit ?? {}),
    };

    const started = Date.now();
    const res = await fetch(bookingUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(25_000),
    });

    const ms = Date.now() - started;
    const responseBody = !res.ok ? await res.text() : undefined;

    logExternalApi({
      tag: LOG,
      url: bookingUrl.toString(),
      method: "POST",
      headers,
      body: requestBody,
      status: res.status,
      ok: res.ok,
      ms,
      responseBody,
      leadId: payload.leadId,
    });

    if (!res.ok) {
      console.error(`${LOG} AirConnect notification failed`, { status: res.status, ms });
    }
  } catch (err) {
    console.error(`${LOG} AirConnect notification error`, err);
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<Body>;
  const { date, time, token } = body;

  if (!date || !time || !token) {
    return NextResponse.json({ error: "date, time, and token are required" }, { status: 400 });
  }

  // Validate token
  const payload = verifyAxsToken(token);
  if (!payload) {
    console.warn(`${LOG} reject: invalid or expired token`);
    return NextResponse.json({ error: "Invalid or expired booking link" }, { status: 401 });
  }

  const { leadId, axsRef: tokenAxsRef, approvedAmount } = payload;
  // Customer-facing ref — CFAXS-, matching what /api/axs/submit returned.
  const cfh5Id = axsApplicationRef(leadId);

  console.info(`${LOG} POST`, { leadId, axsRef: tokenAxsRef, cfh5Id, date, time });

  const admin = createAdminClient();

  // Fetch lead details
  const { data: lead } = await admin
    .from("leads")
    .select("full_name, mobile, nric, axs_ref")
    .eq("id", leadId)
    .single();

  if (!lead) {
    console.error(`${LOG} lead not found`, { leadId });
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Prefer our own record over the token. The stored value is the one we can
  // audit and reconcile against; the token only carries what was in flight at
  // submit time. Falls back to the token for leads created before axs_ref.
  const axsRef = lead.axs_ref || tokenAxsRef;

  // One booking per application. The link never expires and is replayable,
  // so without this a customer can return and book again — each one inserting
  // a row and re-notifying both AirConnect and AXS. A repeat of the same slot
  // is treated as a double-tap and answered idempotently; a different slot is
  // a reschedule attempt, which we have no flow for, so it is refused. Only a
  // cancel or a miss reported by AirConnect frees the link to book again; a
  // completed visit keeps it closed (a new loan goes back through AXS).
  const { data: existing } = await admin
    .from("appointments")
    .select("id, appointment_date, appointment_time")
    .eq("lead_id", leadId)
    .in("status", BOOKING_LOCK_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const sameSlot =
      String(existing.appointment_date) === date &&
      String(existing.appointment_time ?? "").slice(0, 5) === time.slice(0, 5);

    // A double-tap on the same slot is not an error — hand back the booking
    // they already have, without creating a second one or re-notifying.
    if (sameSlot) {
      console.info(`${LOG} repeat submit for the same slot — returning existing`, {
        leadId,
        appointmentId: existing.id,
        date,
        time,
      });
      return NextResponse.json({
        ok: true,
        appointmentId: existing.id as string,
        cfh5Id,
        loanAmount: approvedAmount,
        date,
        time,
      });
    }

    // A different slot means they are trying to move the appointment. We have
    // no reschedule flow — AirConnect and AXS have both been told about the
    // first one — so refuse rather than silently double-book.
    console.warn(`${LOG} second booking refused — appointment already exists`, {
      leadId,
      appointmentId: existing.id,
      existingDate: existing.appointment_date,
      requested: `${date} ${time}`,
    });
    return NextResponse.json(
      {
        error: "This application already has an appointment.",
        appointmentId: existing.id as string,
        cfh5Id,
        date: String(existing.appointment_date),
        time: String(existing.appointment_time ?? "").slice(0, 5),
      },
      { status: 409 },
    );
  }

  // Create appointment
  const { data: appointment, error: apptError } = await admin
    .from("appointments")
    .insert({
      lead_id: leadId,
      appointment_date: date,
      appointment_time: time,
      status: "confirmed",
    })
    .select("id")
    .single();

  if (apptError || !appointment?.id) {
    console.error(`${LOG} insert appointment failed`, apptError);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  // Update lead status
  await admin.from("leads").update({ status: "appointed" }).eq("id", leadId);

  console.info(`${LOG} appointment saved`, { appointmentId: appointment.id, cfh5Id, date, time });

  // The limit V1 generated. Read from our own record rather than the token:
  // the token carries what was approved at submit, the assessment is what we
  // can audit. Null for a decline, in which case no field is sent.
  const { data: assessment } = await admin
    .from("credit_assessments")
    .select("approved_loan_amount, created_at")
    .eq("lead_id", leadId)
    .maybeSingle();

  // Notify AirConnect
  await notifyAirConnect({
    customerName: lead.full_name ?? "",
    phoneNumber: lead.mobile ?? "",
    appointmentDate: date,
    timeSlot: time,
    leadId,
    loanAmount: approvedAmount,
    idNumber: lead.nric ?? undefined,
    axsRef,
    creditLimit: buildCreditLimitFields({
      approvedLoanAmount: assessment?.approved_loan_amount,
      decidedAt: assessment?.created_at,
      // CFH5- form, matching the cfh5Id this payload already carries, so
      // AirConnect sees one consistent reference for the lead.
      applicationRef: cfh5ApplicationRef(leadId),
    }),
  });

  // Notify AXS of the booking (no-op until AXS_BOOKING_WEBHOOK_URL is set)
  const webhook = await sendAxsBookingWebhook({
    axsRef,
    leadId,
    applicationRef: cfh5Id, // CFAXS-XXXXXXXX — goes out as metadata.booking_id
    status: "booked",
    appointmentDate: date,
    appointmentTime: time,
    bookingLink: axsBookingLink(token),
    logTag: "[axs/book:webhook]",
  });

  // Recorded so a later AirConnect event for the same slot sends nothing new.
  if (webhook.ok) {
    await admin
      .from("appointments")
      .update({ axs_notified_status: "booked", axs_notified_at: new Date().toISOString() })
      .eq("id", appointment.id);
  }

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id as string,
    cfh5Id,
    loanAmount: approvedAmount,
    date,
    time,
  });
}
