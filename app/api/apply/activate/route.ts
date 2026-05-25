import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  encodeSession,
  sessionCookieValue,
  gateCookieValue,
  SESSION_COOKIE,
  GATE_COOKIE,
} from "@/lib/apply-session";
import {
  APPLY_TRACE_ID_KEY,
  byteLength,
  computeResumeWouldPass,
  logApplyFlowEvent,
  newApplyTraceId,
} from "@/lib/apply-flow-log";
import type { LoanFormData } from "@/lib/loan-form";
import { createAdminClient } from "@/lib/supabase/client";
import { looksLikeLeadUuid } from "@/lib/lead-id";
import { draftLeadCookieValue, DRAFT_LEAD_COOKIE } from "@/lib/apply-session";
import { buildActivateSessionCookie } from "@/lib/apply-session-slim";
import { upsertMyinfoProfileForLead } from "@/lib/myinfo-profile";

export const runtime = "nodejs";

type SessionWithTrace = Partial<LoanFormData> & { applyTraceId?: string };

// GET /api/apply/activate?token=<signed-myinfo-patch>
//
// The browser lands here after the Lambda → Singpass → Lambda → webhook flow.
// We merge the MyInfo patch with the existing apply_session cookie, set the
// apply_gate cookie, and redirect to /apply/review (no PII in URL).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const tokenDecodeOk = Boolean(token && decodeSession(token));
  const myinfoPatch = token ? (decodeSession(token) ?? {}) : {};

  const existingRaw = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const existing: SessionWithTrace = existingRaw
    ? (decodeSession(existingRaw) ?? {})
    : {};

  const merged: SessionWithTrace = { ...existing, ...myinfoPatch };
  if (!merged[APPLY_TRACE_ID_KEY]) {
    merged[APPLY_TRACE_ID_KEY] = existing[APPLY_TRACE_ID_KEY] ?? newApplyTraceId();
  }

  // ── Create partial lead while MyInfo data is fresh ─────────────────────────
  // Stored in a dedicated draft_lead cookie — NOT in the session — so the
  // funnel gate logic is completely unaffected.
  const hasLoanDetails =
    typeof merged.amount === "number" && merged.amount > 0 &&
    typeof merged.tenure === "number" && merged.tenure > 0;
  // Don't create a second draft if the browser already has one from this journey.
  const existingDraftLeadId = request.cookies.get(DRAFT_LEAD_COOKIE)?.value ?? "";
  const alreadyHasDraft = looksLikeLeadUuid(existingDraftLeadId);

  let newDraftLeadId: string | null = null;
  if (hasLoanDetails && !alreadyHasDraft) {
    try {
      const admin = createAdminClient();
      const { data: partialLead } = await admin
        .from("leads")
        .insert({
          loan_amount: merged.amount!,
          loan_tenure: merged.tenure!,
          loan_purpose: merged.loanPurpose || null,
          urgency: merged.urgency || null,
          auth_method: "singpass",
          id_type: (merged.idType || null) as "singaporean" | "pr" | "foreigner" | null,
          full_name: merged.fullName || null,
          nric: merged.nric || null,
          email: merged.email || null,
          mobile: merged.mobile || null,
          address: merged.address || null,
          postal_code: merged.postalCode || null,
          monthly_income: merged.monthlyIncome || null,
          status: "in_progress",
          moneylender_no_loans: false,
        })
        .select("id")
        .single();

      if (partialLead?.id) {
        newDraftLeadId = partialLead.id as string;
      }
    } catch (err) {
      console.error("[activate] partial lead creation failed:", err);
    }
  }

  const draftLeadId =
    newDraftLeadId ??
    (alreadyHasDraft ? existingDraftLeadId : null);

  if (
    draftLeadId &&
    merged.authMethod === "singpass" &&
    merged.nric?.trim() &&
    merged.fullName?.trim()
  ) {
    try {
      const admin = createAdminClient();
      await upsertMyinfoProfileForLead(admin, draftLeadId, merged);
    } catch (err) {
      console.error("[activate] myinfo_profiles upsert failed:", err);
    }
  }

  const slimSession = buildActivateSessionCookie(merged);
  const encoded = encodeSession(slimSession);
  const hadApplyGateBefore = request.cookies.get(GATE_COOKIE)?.value === "1";
  const resumeWouldPass = computeResumeWouldPass(slimSession, true);

  await logApplyFlowEvent({
    event: "activate_merged",
    traceId: merged[APPLY_TRACE_ID_KEY]!,
    applyTraceId: merged[APPLY_TRACE_ID_KEY] ?? null,
    singpassRawKey: merged.singpassRawKey || null,
    request,
    requestPath: request.nextUrl.pathname,
    hadExistingSessionCookie: Boolean(existingRaw),
    hadActivateToken: Boolean(token),
    tokenDecodeOk,
    hadApplyGateCookie: hadApplyGateBefore,
    cookieExistingBytes: byteLength(existingRaw),
    cookieTokenBytes: byteLength(token),
    cookieMergedBytes: byteLength(encoded),
    resumeWouldPass,
    sessionBefore: existing,
    sessionAfter: slimSession,
    details: {
      redirect_to: "/apply/review",
      had_apply_gate_before: hadApplyGateBefore,
      draft_lead_id: draftLeadId,
      myinfo_persisted: Boolean(draftLeadId),
      singpass_raw_key_from_token: Boolean(
        (myinfoPatch as Partial<LoanFormData>).singpassRawKey,
      ),
    },
  });

  const reviewUrl = new URL("/apply/review", request.nextUrl.origin);
  const res = NextResponse.redirect(reviewUrl, { status: 302 });

  const sc = sessionCookieValue(slimSession);
  res.cookies.set({ ...sc, value: encoded });
  res.cookies.set(gateCookieValue());

  if (newDraftLeadId) {
    res.cookies.set(draftLeadCookieValue(newDraftLeadId));
  } else if (draftLeadId && alreadyHasDraft) {
    res.cookies.set(draftLeadCookieValue(draftLeadId));
  }

  return res;
}
