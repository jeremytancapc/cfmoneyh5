/**
 * POST /api/airconnect/appointment-event
 *
 * AirConnect tells us an AXS customer's appointment changed: an agent created,
 * moved, cancelled or closed it, or the branch marked it missed or done. We
 * mirror that onto our own appointment row and pass it on to AXS, so the AXS
 * app shows the customer where they stand — and after a cancel or a miss, the
 * booking link they already hold books again.
 *
 * Body: { h5LeadId, channel: "axs", event, appointmentId, startDatetime }
 *
 * Best effort on both sides: AirConnect sends once and does not retry, so this
 * always answers 200 once authenticated — a failure here, or AXS refusing the
 * webhook, is logged and dropped. The decision itself is in lib/axs-status-sync.
 */

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { createAxsToken } from "@/lib/axs-token";
import { axsApplicationRef, looksLikeLeadUuid } from "@/lib/lead-id";
import { axsBookingLink, sendAxsBookingWebhook } from "@/lib/axs-webhook";
import {
  AIRCONNECT_APPOINTMENT_EVENTS,
  decideAxsEvent,
  type AirConnectAppointmentEvent,
  type LocalAppointment,
} from "@/lib/axs-status-sync";

export const runtime = "nodejs";

const LOG = "[airconnect/appointment-event]";
// Same defaults /api/axs/submit uses when AXS omit them.
const DEFAULT_TENURE = 12;
const DEFAULT_REQUESTED_AMOUNT = 20000;

function keyMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.H5_EVENT_WEBHOOK_KEY;
  const givenKey = request.headers.get("x-api-key") ?? "";
  if (!expectedKey || !keyMatches(givenKey, expectedKey)) {
    console.warn(`${LOG} reject: invalid API key`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const h5LeadId = typeof body?.h5LeadId === "string" ? body.h5LeadId.trim() : "";
  const event = body?.event as AirConnectAppointmentEvent;
  const appointmentId = body?.appointmentId;
  const startDatetime = body?.startDatetime;

  if (
    !looksLikeLeadUuid(h5LeadId) ||
    body?.channel !== "axs" ||
    !AIRCONNECT_APPOINTMENT_EVENTS.includes(event) ||
    typeof appointmentId !== "number" ||
    !Number.isInteger(appointmentId) ||
    typeof startDatetime !== "string"
  ) {
    return NextResponse.json(
      { error: "Expected { h5LeadId, channel: 'axs', event, appointmentId, startDatetime }" },
      { status: 400 },
    );
  }

  console.info(`${LOG} received`, { leadId: h5LeadId, event, appointmentId, startDatetime });

  // Kill switch: until this is on, events are only logged, nothing changes.
  if (process.env.AXS_STATUS_SYNC_ENABLED !== "true") {
    console.info(`${LOG} AXS_STATUS_SYNC_ENABLED is off — event logged only`);
    return NextResponse.json({ ok: true, applied: false, reason: "sync disabled" });
  }

  try {
    const admin = createAdminClient();

    const { data: lead } = await admin
      .from("leads")
      .select("id, auth_method, axs_ref, axs_booking_token, loan_amount, loan_tenure")
      .eq("id", h5LeadId)
      .maybeSingle();

    if (!lead || lead.auth_method !== "axs") {
      console.warn(`${LOG} ignored: not an AXS lead`, { leadId: h5LeadId });
      return NextResponse.json({ ok: true, applied: false, reason: "not an AXS lead" });
    }

    const { data: latest } = await admin
      .from("appointments")
      .select("id, status, appointment_date, appointment_time, airconnect_appointment_id, axs_notified_status")
      .eq("lead_id", h5LeadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const decision = decideAxsEvent((latest as LocalAppointment | null) ?? null, {
      event,
      appointmentId,
      startDatetime,
    });
    console.info(`${LOG} decision`, { leadId: h5LeadId, reason: decision.reason, axs: decision.axs?.status ?? null });

    // 1. Our own row.
    let rowId: string | null = latest?.id ?? null;
    if (decision.local.kind === "update") {
      const { error } = await admin.from("appointments").update(decision.local.fields).eq("id", decision.local.id);
      if (error) throw new Error(`update appointment: ${error.message}`);
    } else if (decision.local.kind === "insert") {
      const { data: inserted, error } = await admin
        .from("appointments")
        .insert({ lead_id: h5LeadId, ...decision.local.fields })
        .select("id")
        .single();
      if (error || !inserted?.id) throw new Error(`insert appointment: ${error?.message ?? "no id returned"}`);
      rowId = inserted.id as string;
    }

    // 2. AXS.
    if (!decision.axs) {
      return NextResponse.json({ ok: true, applied: decision.local.kind !== "none", axsSent: false, reason: decision.reason });
    }

    if (!lead.axs_ref) {
      console.warn(`${LOG} cannot notify AXS: lead has no axs_ref`, { leadId: h5LeadId });
      return NextResponse.json({ ok: true, applied: true, axsSent: false, reason: "no axs_ref on lead" });
    }

    const token = (lead.axs_booking_token as string | null) ?? (await mintFallbackToken(admin, lead));

    const webhook = await sendAxsBookingWebhook({
      axsRef: lead.axs_ref as string,
      leadId: h5LeadId,
      applicationRef: axsApplicationRef(h5LeadId),
      status: decision.axs.status,
      appointmentDate: decision.axs.date,
      appointmentTime: decision.axs.time,
      bookingLink: axsBookingLink(token),
      logTag: `[airconnect/appointment-event:${event}]`,
    });

    if (webhook.ok && rowId) {
      await admin
        .from("appointments")
        .update({ axs_notified_status: decision.axs.status, axs_notified_at: new Date().toISOString() })
        .eq("id", rowId);
    }

    return NextResponse.json({ ok: true, applied: true, axsSent: webhook.ok, reason: decision.reason });
  } catch (err) {
    // Still 200: AirConnect does not retry, so an error status would only add noise there.
    console.error(`${LOG} failed`, { leadId: h5LeadId, event, appointmentId }, err);
    return NextResponse.json({ ok: false, applied: false, reason: "internal error" });
  }
}

/**
 * Leads from before axs_booking_token was stored: mint a link the same way
 * /api/axs/submit does. Valid and books the same application; it is simply not
 * the identical string AXS were first given.
 */
async function mintFallbackToken(
  admin: ReturnType<typeof createAdminClient>,
  lead: { id: string; axs_ref: string | null; loan_amount: number | null; loan_tenure: number | null },
): Promise<string> {
  const { data: assessment } = await admin
    .from("credit_assessments")
    .select("approved_loan_amount")
    .eq("lead_id", lead.id)
    .maybeSingle();
  const approved = Number(assessment?.approved_loan_amount ?? 0);

  // Submit falls back to the amount AXS asked for when nothing was approved
  // (leads.loan_amount is overwritten with the approved 0), so do the same.
  let amount = approved;
  if (!(amount > 0)) {
    const { data: profile } = await admin
      .from("myinfo_profiles")
      .select("requested:raw_payload->axs->loan_amount")
      .eq("lead_id", lead.id)
      .maybeSingle();
    const requested = Number(profile?.requested ?? 0);
    amount = requested > 0 ? requested : Number(lead.loan_amount ?? 0) || DEFAULT_REQUESTED_AMOUNT;
  }

  return createAxsToken({
    leadId: lead.id,
    axsRef: lead.axs_ref ?? "",
    approvedAmount: amount,
    tenure: Number(lead.loan_tenure ?? DEFAULT_TENURE),
  });
}
