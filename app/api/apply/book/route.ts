/**
 * POST /api/apply/book
 *
 * Saves the chosen appointment slot to Supabase and then clears all apply cookies.
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

  // Update the lead status to "appointed"
  await admin
    .from("leads")
    .update({ status: "appointed" })
    .eq("id", leadId);

  const res = NextResponse.json({ ok: true });

  for (const c of clearCookies()) {
    res.cookies.set(c);
  }

  return res;
}
