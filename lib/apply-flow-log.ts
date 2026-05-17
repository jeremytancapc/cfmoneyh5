/**
 * Persist apply / Singpass funnel diagnostics to Supabase `apply_flow_events`.
 * Used on production (stg) to debug customer complaints without storing full PII.
 */

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/client";
import type { LoanFormData } from "@/lib/loan-form";

export const APPLY_TRACE_ID_KEY = "applyTraceId";

export type ApplyFlowEventName =
  | "singpass_gate_saved"
  | "manual_gate_saved"
  | "auth_callback_received"
  | "activate_merged";

/** Browser cookie size guidance (~4 KB limit for Set-Cookie). */
export const COOKIE_SIZE_WARN_BYTES = 3800;

export type SessionSnapshot = {
  auth_method: string | null;
  has_nric: boolean;
  has_full_name: boolean;
  has_mobile: boolean;
  has_amount: boolean;
  has_monthly_income: boolean;
  cpf_count: number;
  noa_count: number;
  has_singpass_raw_key: boolean;
  has_apply_trace_id: boolean;
};

export type ApplyFlowLogInput = {
  event: ApplyFlowEventName;
  traceId: string;
  request?: NextRequest;
  requestPath?: string;
  singpassRawKey?: string | null;
  applyTraceId?: string | null;
  hadExistingSessionCookie?: boolean;
  hadActivateToken?: boolean;
  tokenDecodeOk?: boolean | null;
  hadApplyGateCookie?: boolean;
  cookieExistingBytes?: number | null;
  cookieTokenBytes?: number | null;
  cookieMergedBytes?: number | null;
  resumeWouldPass?: boolean | null;
  sessionBefore?: Partial<LoanFormData> | null;
  sessionAfter?: Partial<LoanFormData> | null;
  details?: Record<string, unknown>;
};

export function newApplyTraceId(): string {
  return randomUUID();
}

export function byteLength(value: string | undefined | null): number | null {
  if (!value) return null;
  return Buffer.byteLength(value, "utf8");
}

export function last4(value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  if (v.length < 4) return null;
  return v.slice(-4).toUpperCase();
}

export function snapshotSession(data: Partial<LoanFormData> | null | undefined): SessionSnapshot {
  const d = data ?? {};
  const trace = d as Partial<LoanFormData> & { applyTraceId?: string };
  return {
    auth_method: d.authMethod || null,
    has_nric: Boolean(d.nric?.trim()),
    has_full_name: Boolean(d.fullName?.trim()),
    has_mobile: Boolean(d.mobile?.trim()),
    has_amount: typeof d.amount === "number" && d.amount > 0,
    has_monthly_income: Boolean(d.monthlyIncome?.trim()),
    cpf_count: d.cpfContributions?.length ?? 0,
    noa_count: d.noaHistory?.length ?? 0,
    has_singpass_raw_key: Boolean(d.singpassRawKey),
    has_apply_trace_id: Boolean(trace.applyTraceId),
  };
}

/** Mirrors app/page.tsx resumeSingpassReview — logged for diagnosis, not as the fix. */
export function computeResumeWouldPass(
  session: Partial<LoanFormData>,
  hasApplyGate: boolean,
): boolean {
  return Boolean(
    session.authMethod === "singpass" &&
      hasApplyGate &&
      (session.nric?.trim() || session.fullName?.trim()),
  );
}

function lookupSuffixes(
  ...sources: Array<Partial<LoanFormData> | null | undefined>
): { mobile_last4: string | null; nric_last4: string | null } {
  for (const s of sources) {
    const m = last4(s?.mobile);
    const n = last4(s?.nric);
    if (m || n) return { mobile_last4: m, nric_last4: n };
  }
  return { mobile_last4: null, nric_last4: null };
}

function runtimeMeta() {
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    vercel_deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  };
}

/**
 * Insert one diagnostic row. Never throws — failures are console-only so redirects are not blocked.
 */
export async function logApplyFlowEvent(input: ApplyFlowLogInput): Promise<void> {
  try {
    const db = createAdminClient();
    const mergedBytes = input.cookieMergedBytes ?? null;
    const suffixes = lookupSuffixes(input.sessionAfter, input.sessionBefore);

    const row = {
      trace_id: input.traceId,
      event: input.event,
      ...runtimeMeta(),
      singpass_raw_key: input.singpassRawKey ?? null,
      apply_trace_id: input.applyTraceId ?? null,
      ...suffixes,
      had_existing_session_cookie: input.hadExistingSessionCookie ?? false,
      had_activate_token: input.hadActivateToken ?? false,
      token_decode_ok: input.tokenDecodeOk ?? null,
      had_apply_gate_cookie: input.hadApplyGateCookie ?? null,
      cookie_existing_bytes: input.cookieExistingBytes ?? null,
      cookie_token_bytes: input.cookieTokenBytes ?? null,
      cookie_merged_bytes: mergedBytes,
      cookie_may_exceed_4kb:
        mergedBytes != null ? mergedBytes >= COOKIE_SIZE_WARN_BYTES : null,
      resume_would_pass: input.resumeWouldPass ?? null,
      user_agent: input.request?.headers.get("user-agent") ?? null,
      referer: input.request?.headers.get("referer") ?? null,
      request_path: input.requestPath ?? input.request?.nextUrl.pathname ?? null,
      details: {
        ...(input.details ?? {}),
        session_before: input.sessionBefore ? snapshotSession(input.sessionBefore) : null,
        session_after: input.sessionAfter ? snapshotSession(input.sessionAfter) : null,
      },
    };

    const { error } = await db.from("apply_flow_events").insert(row);
    if (error) {
      console.error("[apply-flow-log] insert failed", error.message, { event: input.event });
    }
  } catch (err) {
    console.error("[apply-flow-log] unexpected error", err);
  }
}
