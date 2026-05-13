/**
 * POST /api/apply/book  (simulation mode — no Supabase)
 *
 * Records the chosen appointment slot and notifies AirConnect.
 * DB write is skipped; AirConnect notification still fires if configured.
 * Body: { date: "YYYY-MM-DD", time: "HH:MM" }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  clearCookies,
  SESSION_COOKIE,
} from "@/lib/apply-session";

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
