/**
 * POST /api/apply/book
 *
 * Saves the chosen appointment slot to Supabase, clears apply cookies, and
 * notifies AirConnect via the external appointments API.
 * Body: { date: "YYYY-MM-DD", time: "HH:MM" }
 * Success JSON: { ok, appointmentId, cfh5Id, loanAmount, date, time }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  clearCookies,
  SESSION_COOKIE,
} from "@/lib/apply-session";
import {
  clearApprovalOfferCookie,
  decodeApprovalOffer,
  APPROVAL_OFFER_COOKIE,
} from "@/lib/approval-offer";
import { bookingConfirmCookieValue } from "@/lib/booking-confirmation";
import { createAdminClient } from "@/lib/supabase/client";
import { logExternalApi } from "@/lib/external-api-logger";

export const runtime = "nodejs";

const LOG = "[apply/book]";

type Body = { date: string; time: string; idNumber?: string };

/** Same convention as the pending UI — last 8 chars of lead UUID, uppercased. */
function cfh5ApplicationRef(leadId: string): string {
  return `CFH5-${leadId.slice(-8).toUpperCase()}`;
}

/** Outbound AirConnect call — must be awaited before returning the HTTP response.
 * If left fire-and-forget, serverless often freezes right after `return res` and the
 * fetch never completes, so upstream never sees the request and you won't get OK/error logs. */
async function notifyAirConnect(payload: {
  customerName: string;
  phoneNumber: string;
  appointmentDate: string;
  timeSlot: string;
  leadId: string;
  loanAmount: number;
  idNumber?: string;
}) {
  const apiKey = process.env.AIRCONNECT_API_KEY;
  const url = process.env.AIRCONNECT_APPOINTMENTS_URL;

  if (!apiKey || !url) {
    console.warn(`${LOG} AirConnect env not configured — skipping notification`, {
      hasApiKey: Boolean(apiKey),
      hasUrl: Boolean(url),
    });
    return;
  }

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
      ...(payload.idNumber ? { idNumber: payload.idNumber } : {}),
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
      console.error(`${LOG} AirConnect notification failed`, {
        status: res.status,
        ms,
        body: responseBody?.slice(0, 500),
      });
    }
  } catch (err) {
    console.error(`${LOG} AirConnect notification error`, err);
  }
}

export async function POST(request: NextRequest) {
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = rawSession ? (decodeSession(rawSession) ?? {}) : {};

  const offerRaw = request.cookies.get(APPROVAL_OFFER_COOKIE)?.value;
  const offer = offerRaw ? decodeApprovalOffer(offerRaw) : null;

  const leadId =
    (typeof session.leadId === "string" && session.leadId.length > 0
      ? session.leadId
      : null) ?? offer?.leadId ?? null;
  console.info(`${LOG} POST`, {
    hasSessionCookie: Boolean(rawSession),
    sessionDecoded: Boolean(session && Object.keys(session).length > 0),
    hasLeadId: Boolean(leadId),
    cfh5Hint: leadId ? cfh5ApplicationRef(String(leadId)) : undefined,
  });

  if (!leadId) {
    console.warn(`${LOG} reject: no leadId in session (cookie missing or stale)`);
    return NextResponse.json({ error: "No active application found" }, { status: 400 });
  }

  const body = (await request.json()) as Partial<Body>;
  const { date, time, idNumber } = body;

  if (!date || !time) {
    console.warn(`${LOG} reject: missing date or time`, { hasDate: Boolean(date), hasTime: Boolean(time) });
    return NextResponse.json({ error: "date and time are required" }, { status: 400 });
  }

  console.info(`${LOG} booking slot`, { date, time, idNumber: idNumber ?? null, cfh5Hint: cfh5ApplicationRef(leadId) });

  const admin = createAdminClient();

  const { data: appointment, error } = await admin
    .from("appointments")
    .insert({
      lead_id: leadId,
      appointment_date: date,
      appointment_time: time,
      status: "confirmed",
    })
    .select("id")
    .single();

  if (error) {
    console.error(`${LOG} insert appointment failed`, error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  if (!appointment?.id) {
    console.error(`${LOG} insert returned no appointment id`);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  console.info(`${LOG} appointment saved`, {
    appointmentId: appointment.id,
    date,
    time,
    cfh5Hint: cfh5ApplicationRef(leadId),
  });

  // Fetch lead details for the AirConnect notification
  const { data: lead } = await admin
    .from("leads")
    .select("full_name, mobile, loan_amount")
    .eq("id", leadId)
    .single();

  // Update the lead status to "appointed"
  const { error: leadUpdateError } = await admin
    .from("leads")
    .update({ status: "appointed" })
    .eq("id", leadId);

  if (leadUpdateError) {
    console.error(`${LOG} lead status update failed`, leadUpdateError);
  } else {
    console.info(`${LOG} lead status → appointed`, { cfh5Hint: cfh5ApplicationRef(leadId) });
  }

  const loanAmount = Number(lead?.loan_amount ?? 0) || 0;
  const cfh5Id = cfh5ApplicationRef(leadId);

  if (!lead) {
    console.warn(`${LOG} lead row missing for notify (AirConnect may get empty name/phone)`, {
      cfh5Id,
    });
  }

  // Notify AirConnect — await so serverless completes the outbound fetch before freeze.
  // Booking still succeeds in DB even if AirConnect fails (errors logged above).
  await notifyAirConnect({
    customerName: lead?.full_name ?? "",
    phoneNumber: lead?.mobile ?? "",
    appointmentDate: date,
    timeSlot: time,
    leadId,
    loanAmount,
    ...(idNumber ? { idNumber } : {}),
  });

  const res = NextResponse.json({
    ok: true,
    appointmentId: appointment.id as string,
    cfh5Id,
    loanAmount,
    date,
    time,
  });

  for (const c of clearCookies()) {
    res.cookies.set(c);
  }
  res.cookies.set(clearApprovalOfferCookie());

  res.cookies.set(
    bookingConfirmCookieValue({
      appointmentId: appointment.id as string,
      cfh5Id,
      loanAmount,
      date,
      time,
      idType: typeof session.idType === "string" ? session.idType : undefined,
    }),
  );

  console.info(`${LOG} success — apply cookies cleared, booking_confirm set`, {
    appointmentId: appointment.id,
    cfh5Id,
    date,
    time,
  });

  return res;
}
