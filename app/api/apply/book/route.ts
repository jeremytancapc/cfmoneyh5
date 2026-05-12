/**
 * POST /api/apply/book
 *
 * Saves the chosen appointment slot to Supabase, clears apply cookies, and
 * notifies AirConnect via the external appointments API.
 * Body: { date: "YYYY-MM-DD", time: "HH:MM" }
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

async function notifyAirConnect(
  customerName: string,
  phoneNumber: string,
  appointmentDate: string,
  timeSlot: string,
) {
  const apiKey = process.env.AIRCONNECT_API_KEY;
  const url = process.env.AIRCONNECT_APPOINTMENTS_URL;

  if (!apiKey || !url) {
    console.warn("AirConnect env vars not configured — skipping notification");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app: "dashboard",
        customerName,
        phoneNumber,
        appointmentDate,
        timeSlot,
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

  const { error } = await admin.from("appointments").insert({
    lead_id: leadId,
    appointment_date: date,
    appointment_time: time,
    status: "confirmed",
  });

  if (error) {
    // Unique slot conflict — someone else just took this slot
    if (error.code === "23505") {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    console.error("Failed to save appointment:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  // Fetch lead details for the AirConnect notification
  const { data: lead } = await admin
    .from("leads")
    .select("full_name, mobile")
    .eq("id", leadId)
    .single();

  // Update the lead status to "appointed"
  await admin
    .from("leads")
    .update({ status: "appointed" })
    .eq("id", leadId);

  // Notify AirConnect — fire-and-forget so a failure doesn't block the response
  notifyAirConnect(
    lead?.full_name ?? "",
    lead?.mobile ?? "",
    date,
    time,
  );

  const res = NextResponse.json({ ok: true });

  for (const c of clearCookies()) {
    res.cookies.set(c);
  }

  return res;
}
