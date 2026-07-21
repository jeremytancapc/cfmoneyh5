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

export const runtime = "nodejs";

const LOG = "[axs/book]";

type Body = { date: string; time: string; token: string };

function cfh5ApplicationRef(leadId: string): string {
  return `CFH5-${leadId.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

async function notifyAirConnect(payload: {
  customerName: string;
  phoneNumber: string;
  appointmentDate: string;
  timeSlot: string;
  leadId: string;
  loanAmount: number;
  idNumber?: string;
  axsRef?: string;
}) {
  const apiKey = process.env.AIRCONNECT_API_KEY;
  const url = process.env.AIRCONNECT_APPOINTMENTS_URL;

  if (!apiKey || !url) {
    console.warn(`${LOG} AirConnect env not configured — skipping notification`);
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
      source: "axs",
      ...(payload.idNumber ? { idNumber: payload.idNumber } : {}),
      ...(payload.axsRef ? { axsRef: payload.axsRef } : {}),
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

  const { leadId, axsRef, approvedAmount } = payload;
  const cfh5Id = cfh5ApplicationRef(leadId);

  console.info(`${LOG} POST`, { leadId, axsRef, cfh5Id, date, time });

  const admin = createAdminClient();

  // Fetch lead details
  const { data: lead } = await admin
    .from("leads")
    .select("full_name, mobile, nric")
    .eq("id", leadId)
    .single();

  if (!lead) {
    console.error(`${LOG} lead not found`, { leadId });
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
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
  });

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id as string,
    cfh5Id,
    loanAmount: approvedAmount,
    date,
    time,
  });
}
