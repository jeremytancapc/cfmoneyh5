/**
 * POST /api/apply/book
 *
 * Records the chosen appointment slot in Supabase and notifies AirConnect.
 * Body: { date: "YYYY-MM-DD", time: "HH:MM" }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  clearCookies,
  SESSION_COOKIE,
} from "@/lib/apply-session";
import { createAdminClient } from "@/lib/supabase/client";
import type { AppointmentInsert } from "@/lib/supabase/types";

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

  const leadId = (session as Record<string, string>).leadId;
  if (!leadId) {
    return NextResponse.json({ error: "No active application found" }, { status: 400 });
  }

  const body = (await request.json()) as Partial<Body>;
  const { date, time } = body;

  if (!date || !time) {
    return NextResponse.json({ error: "date and time are required" }, { status: 400 });
  }

  // ── Write appointment to Supabase ─────────────────────────────────────────
  const db = createAdminClient();

  const appointmentInsert: AppointmentInsert = {
    lead_id: leadId,
    appointment_date: date,
    appointment_time: time,
    status: "pending",
    notes: null,
    reminder_sent_at: null,
    cancelled_at: null,
    cancellation_reason: null,
  };

  const { error: appointmentError } = await db
    .from("appointments")
    .insert(appointmentInsert);

  if (appointmentError) {
    console.error("Failed to insert appointment:", appointmentError);
    return NextResponse.json({ error: "Failed to save appointment" }, { status: 500 });
  }

  // Update lead status to "appointed"
  const { error: leadUpdateError } = await db
    .from("leads")
    .update({ status: "appointed" })
    .eq("id", leadId);

  if (leadUpdateError) {
    // Non-fatal — appointment is saved; log and continue.
    console.error("Failed to update lead status:", leadUpdateError);
  }

  // Notify AirConnect — fire-and-forget; failure does not block the response.
  notifyAirConnect(
    (session as Record<string, string>).fullName ?? "",
    (session as Record<string, string>).mobile ?? "",
    date,
    time,
  );

  const res = NextResponse.json({ ok: true });

  for (const c of clearCookies()) {
    res.cookies.set(c);
  }

  return res;
}
