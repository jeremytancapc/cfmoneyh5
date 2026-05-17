import { NextRequest, NextResponse } from "next/server";
import {
  sessionCookieValue,
  gateCookieValue,
  reviewGateCookieValue,
  clearCookies,
  decodeSession,
  encodeSession,
  SESSION_COOKIE,
} from "@/lib/apply-session";
import type { LoanFormData } from "@/lib/loan-form";
import {
  APPLY_TRACE_ID_KEY,
  byteLength,
  logApplyFlowEvent,
  newApplyTraceId,
} from "@/lib/apply-flow-log";

export const runtime = "nodejs";

type RequestBody = {
  formData: Partial<LoanFormData>;
  gate?: "apply" | "review";
};

type SessionWithTrace = Partial<LoanFormData> & { applyTraceId?: string };

// POST — save form data and set gate cookie
export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const { formData, gate = "apply" } = body;

  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  const prev: SessionWithTrace = existing ? (decodeSession(existing) ?? {}) : {};
  const merged: SessionWithTrace = { ...prev, ...formData };

  const isSingpassGate =
    gate === "apply" && formData.authMethod === "singpass";

  if (isSingpassGate && !merged[APPLY_TRACE_ID_KEY]) {
    merged[APPLY_TRACE_ID_KEY] = newApplyTraceId();
  }

  const encoded = encodeSession(merged);

  const res = NextResponse.json({ ok: true });

  const sc = sessionCookieValue(merged);
  res.cookies.set({ ...sc, value: encoded });

  if (gate === "apply" || gate === "review") {
    if (gate === "apply") {
      res.cookies.set(gateCookieValue());
    } else {
      res.cookies.set(reviewGateCookieValue());
    }
  }

  if (isSingpassGate && merged[APPLY_TRACE_ID_KEY]) {
    await logApplyFlowEvent({
      event: "singpass_gate_saved",
      traceId: merged[APPLY_TRACE_ID_KEY],
      applyTraceId: merged[APPLY_TRACE_ID_KEY],
      request,
      requestPath: "/api/apply/session",
      hadExistingSessionCookie: Boolean(existing),
      cookieExistingBytes: byteLength(existing),
      cookieMergedBytes: byteLength(encoded),
      sessionBefore: prev,
      sessionAfter: merged,
      details: { gate },
    });
  }

  return res;
}

// DELETE — clear all apply cookies (called on booking confirmation)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  for (const c of clearCookies()) {
    res.cookies.set(c);
  }
  return res;
}
