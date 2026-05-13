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

type Body = { date: string; time: string };

/** Same convention as the pending UI — last 8 chars of lead UUID, uppercased. */
function cfh5ApplicationRef(leadId: string): string {
  return `CFH5-${leadId.slice(-8).toUpperCase()}`;
}

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
    console.warn("AirConnect env vars not configured — skipping notification");
    return;
  }

  const cfh5Id = cfh5ApplicationRef(payload.leadId);

  try {
    const bookingUrl = new URL(url);
    bookingUrl.searchParams.set("cfh5Id", cfh5Id);
    bookingUrl.searchParams.set("loanAmount", String(payload.loanAmount));
    bookingUrl.searchParams.set("leadId", payload.leadId);

    const res = await fetch(bookingUrl.toString(), {
      method: "POST",
      headers: {
        "apikey": apiKey,
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
    });

    if (!res.ok) {
      console.error("AirConnect notification failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("AirConnect notification error:", err);
  }
}

export async function POST(request: NextRequest) {
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = rawSession ? (decodeSession(rawSession) ?? {}) : {};

  const leadId = session.leadId;
  if (!leadId) {
    return NextResponse.json({ error: "No active application found" }, { status: 400 });
  }

  const body = (await request.json()) as Partial<Body>;
  const { date, time } = body;

  if (!date || !time) {
    return NextResponse.json({ error: "date and time are required" }, { status: 400 });
  }

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
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    console.error("Failed to save appointment:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  if (!appointment?.id) {
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  // Fetch lead details for the AirConnect notification
  const { data: lead } = await admin
    .from("leads")
    .select("full_name, mobile, loan_amount")
    .eq("id", leadId)
    .single();

  // Update the lead status to "appointed"
  await admin
    .from("leads")
    .update({ status: "appointed" })
    .eq("id", leadId);

  const loanAmount = Number(lead?.loan_amount ?? 0) || 0;
  const cfh5Id = cfh5ApplicationRef(leadId);

  // Notify AirConnect — fire-and-forget so a failure doesn't block the response
  notifyAirConnect({
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

  return res;
}
