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
}) {
  const apiKey = process.env.AIRCONNECT_API_KEY;
  const url = process.env.AIRCONNECT_APPOINTMENTS_URL;

  if (!apiKey || !url) {
    console.warn(`${LOG} AirConnect env not configured — skipping notification`);
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

async function notifyBookingWebhook(payload: {
  axsRef: string;
  leadId: string;
  cfh5Id: string;
  appointmentId: string;
  customerName: string;
  phoneNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  approvedAmount: number;
  bookingLink: string;
}) {
  const url = process.env.AXS_BOOKING_WEBHOOK_URL;

  if (!url) {
    console.warn(`${LOG} AXS_BOOKING_WEBHOOK_URL not configured — skipping booking webhook`);
    return;
  }

  const requestBody = {
    event: "appointment_booked",
    ...payload,
    bookedAt: new Date().toISOString(),
  };

  try {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15_000),
    });

    const ms = Date.now() - started;
    const responseBody = !res.ok ? await res.text() : undefined;

    logExternalApi({
      tag: "[axs/book:webhook]",
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      status: res.status,
      ok: res.ok,
      ms,
      responseBody,
      leadId: payload.leadId,
    });

    if (!res.ok) {
      console.error(`${LOG} booking webhook failed`, { status: res.status, ms });
    }
  } catch (err) {
    console.error(`${LOG} booking webhook error`, err);
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
  // Customer-facing ref — CFAXS-, matching what /api/axs/submit returned.
  const cfh5Id = axsApplicationRef(leadId);

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

  // Notify custom booking webhook (no-op until AXS_BOOKING_WEBHOOK_URL is set)
  await notifyBookingWebhook({
    axsRef,
    leadId,
    cfh5Id,
    appointmentId: appointment.id as string,
    customerName: lead.full_name ?? "",
    phoneNumber: lead.mobile ?? "",
    appointmentDate: date,
    appointmentTime: time,
    approvedAmount,
    bookingLink: `${process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://apply.crawfort.com"}/axs/book?token=${token}`,
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
