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
import { createAdminClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

const LOG = "[apply/book]";

type Body = { date: string; time: string };

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

    console.info(`${LOG} AirConnect POST`, {
      host: bookingUrl.hostname,
      pathname: bookingUrl.pathname,
      cfh5Id,
      appointmentDate: payload.appointmentDate,
      timeSlot: payload.timeSlot,
      loanAmount: payload.loanAmount,
    });

    const started = Date.now();
    const res = await fetch(bookingUrl.toString(), {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app: "dashboard",
        customerName: payload.customerName,
        phoneNumber: payload.phoneNumber,
        appointmentDate: payload.appointmentDate,
        timeSlot: payload.timeSlot,
        // CFH5 / AirConnect — human-readable ref + amount for ops matching
        cfh5Id,
        leadId: payload.leadId,
        loanAmount: payload.loanAmount,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    const ms = Date.now() - started;

    if (!res.ok) {
      const text = await res.text();
      console.error(`${LOG} AirConnect notification failed`, {
        status: res.status,
        ms,
        body: text.slice(0, 500),
      });
    } else {
      console.info(`${LOG} AirConnect OK`, { status: res.status, ms, cfh5Id });
    }
  } catch (err) {
    console.error(`${LOG} AirConnect notification error`, err);
  }
}

export async function POST(request: NextRequest) {
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = rawSession ? (decodeSession(rawSession) ?? {}) : {};

  const leadId = session.leadId;
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
  const { date, time } = body;

  if (!date || !time) {
    console.warn(`${LOG} reject: missing date or time`, { hasDate: Boolean(date), hasTime: Boolean(time) });
    return NextResponse.json({ error: "date and time are required" }, { status: 400 });
  }

  console.info(`${LOG} booking slot`, { date, time, cfh5Hint: cfh5ApplicationRef(leadId) });

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
    // Unique slot conflict — someone else just took this slot
    if (error.code === "23505") {
      console.warn(`${LOG} slot conflict (23505)`, { date, time, cfh5Hint: cfh5ApplicationRef(leadId) });
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
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

  console.info(`${LOG} success — session cookies cleared, JSON response`, {
    appointmentId: appointment.id,
    cfh5Id,
    date,
    time,
  });

  return res;
}
