import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { saveAuthCallbackPayload } from "@/lib/auth-callback-store";
import { encodeSession } from "@/lib/apply-session";
import { buildMyInfoPatch } from "@/lib/myinfo";
import type { LoanFormData } from "@/lib/loan-form";

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

  // Always store full raw payload for the debug result page.
  const debugRid = randomUUID();
  saveAuthCallbackPayload(debugRid, payload);

  // Merge the existing apply_session cookie (if any) with MyInfo data.
  // The browser cookie is NOT available here (server-to-server webhook call),
  // so we only persist the MyInfo fields. The activate route merges them.
  // Raw blobs (CPF, NOA, full MyInfo) stay in the server-side store (keyed by
  // debugRid) and are never put in the cookie to avoid exceeding the 4 KB limit.
  const myinfoPatch = payload.myinfo ? buildMyInfoPatch(payload.myinfo) : {};
  const sessionData: Partial<LoanFormData> = { ...myinfoPatch, singpassRawKey: debugRid };

  // Encode the partial session so the activate route can merge + set cookies.
  const activateToken = encodeSession(sessionData);

  const origin = getRequestOrigin(request);
  const activateUrl = new URL("/api/apply/activate", origin);
  activateUrl.searchParams.set("token", activateToken);

  // Lambda reads `data` and redirects the browser there.
  return NextResponse.json({
    code: 200,
    message: "success",
    data: activateUrl.toString(),
  });
}
