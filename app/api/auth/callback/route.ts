import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { saveAuthCallbackPayload } from "@/lib/auth-callback-store";
import { encodeSession } from "@/lib/apply-session";
import { buildMyInfoPatch } from "@/lib/myinfo";
import type { LoanFormData } from "@/lib/loan-form";
import {
  byteLength,
  logApplyFlowEvent,
  newApplyTraceId,
  snapshotSession,
} from "@/lib/apply-flow-log";

export const runtime = "nodejs";

type MyInfoPayload = {
  myinfo?: Record<string, unknown>;
  state?: string;
  code?: number;
  message?: string;
};

function getRequestOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host  = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let payload: MyInfoPayload = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as MyInfoPayload;
    } catch {
      payload = {};
    }
  }

  const debugRid = randomUUID();
  saveAuthCallbackPayload(debugRid, payload);

  const myinfoPatch = payload.myinfo ? buildMyInfoPatch(payload.myinfo) : {};
  const sessionData: Partial<LoanFormData> = { ...myinfoPatch, singpassRawKey: debugRid };

  const activateToken = encodeSession(sessionData);
  const activateUrl = new URL("/api/apply/activate", getRequestOrigin(request));
  activateUrl.searchParams.set("token", activateToken);

  const traceId = newApplyTraceId();
  await logApplyFlowEvent({
    event: "auth_callback_received",
    traceId,
    singpassRawKey: debugRid,
    request,
    requestPath: "/api/auth/callback",
    hadActivateToken: true,
    tokenDecodeOk: true,
    cookieTokenBytes: byteLength(activateToken),
    sessionAfter: sessionData,
    details: {
      has_myinfo: Boolean(payload.myinfo),
      payload_code: payload.code ?? null,
      payload_message: payload.message ?? null,
      payload_state: payload.state ?? null,
      myinfo_snapshot: snapshotSession(sessionData),
      activate_url_length: activateUrl.toString().length,
    },
  });

  return NextResponse.json({
    code: 200,
    message: "success",
    data: activateUrl.toString(),
  });
}
