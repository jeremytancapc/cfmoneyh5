/**
 * POST /api/aip/book
 *
 * Creates a lead + appointment for an AIP (pre-approved) customer.
 * These customers skip Singpass / manual review — they only supply their
 * mobile number then book directly.
 *
 * Body: { date: "YYYY-MM-DD", time: "HH:MM" }
 * Reads:  aip_session cookie  →  { mobile }
 * Writes: aip_booking_confirm cookie
 * Clears: aip_session cookie
 */
import { NextRequest, NextResponse } from "next/server";
import {
  decodeAipSession,
  AIP_SESSION_COOKIE,
  aipBookingConfirmCookieValue,
  clearAipSessionCookie,
} from "@/lib/aip-session";
import { createAdminClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

const LOG = "[aip/book]";

type Body = { date: string; time: string };

function cfh5ApplicationRef(leadId: string): string {
  return `CFH5-${leadId.slice(-8).toUpperCase()}`;
}


async function notifyAirConnect(payload: {
  customerName: string;
  phoneNumber: string;
  appointmentDate: string;
  timeSlot: string;
  leadId: string;
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
    bookingUrl.searchParams.set("leadId", payload.leadId);

    console.info(`${LOG} AirConnect POST`, {
      host: bookingUrl.hostname,
      cfh5Id,
      appointmentDate: payload.appointmentDate,
      timeSlot: payload.timeSlot,
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
        cfh5Id,
        leadId: payload.leadId,
        loanAmount: 0,
        source: "aip",
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
  const rawSession = request.cookies.get(AIP_SESSION_COOKIE)?.value ?? "";
  const session = rawSession ? decodeAipSession(rawSession) : null;

  console.info(`${LOG} POST`, {
    hasSessionCookie: Boolean(rawSession),
    hasMobile: Boolean(session?.mobile),
  });

  if (!session?.mobile) {
    console.warn(`${LOG} reject: no aip_session cookie or stale`);
    return NextResponse.json(
      { error: "No active pre-approval session. Please start again." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<Body>;
  const { date, time } = body;

  if (!date || !time) {
    console.warn(`${LOG} reject: missing date or time`, { hasDate: Boolean(date), hasTime: Boolean(time) });
    return NextResponse.json({ error: "date and time are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create the lead row — AIP leads skip all form steps so most fields are null.
  const e164Phone = `+65${session.mobile}`;

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      mobile: e164Phone,
      auth_method: "aip",
      status: "appointed",
      loan_amount: 0,
      loan_tenure: 0,
      moneylender_no_loans: false,
    })
    .select("id")
    .single();

  if (leadError || !lead?.id) {
    console.error(`${LOG} insert lead failed`, leadError);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }

  const leadId = lead.id as string;
  const cfh5Id = cfh5ApplicationRef(leadId);

  console.info(`${LOG} lead created`, { leadId, cfh5Id });

  // Create the appointment row.
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

  console.info(`${LOG} appointment saved`, { appointmentId: appointment.id, date, time, cfh5Id });

  // Notify AirConnect — await so serverless completes the outbound fetch before freeze.
  await notifyAirConnect({
    customerName: "AIP Lead",
    phoneNumber: e164Phone,
    appointmentDate: date,
    timeSlot: time,
    leadId,
  });

  const res = NextResponse.json({
    ok: true,
    appointmentId: appointment.id as string,
    cfh5Id,
    date,
    time,
  });

  res.cookies.set(clearAipSessionCookie());
  res.cookies.set(
    aipBookingConfirmCookieValue({
      appointmentId: appointment.id as string,
      cfh5Id,
      date,
      time,
    }),
  );

  console.info(`${LOG} success — aip_session cleared, aip_booking_confirm set`, {
    appointmentId: appointment.id,
    cfh5Id,
    date,
    time,
  });

  return res;
}
