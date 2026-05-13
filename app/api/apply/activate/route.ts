import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  encodeSession,
  sessionCookieValue,
  gateCookieValue,
  SESSION_COOKIE,
} from "@/lib/apply-session";

export const runtime = "nodejs";

// GET /api/apply/activate?token=<signed-myinfo-patch>
//
// The browser lands here after the Lambda → Singpass → Lambda → webhook flow.
// We merge the MyInfo patch with the existing apply_session cookie, set the
// apply_gate cookie, and redirect to the home page form (no PII in URL).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";

  // Decode the MyInfo patch token that the callback route encoded.
  const myinfoPatch = token ? (decodeSession(token) ?? {}) : {};

  // Merge with whatever the browser already has in apply_session.
  const existingRaw = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const existing = existingRaw ? (decodeSession(existingRaw) ?? {}) : {};

  const merged = { ...existing, ...myinfoPatch };
  const encoded = encodeSession(merged);

  const homeUrl = new URL("/", request.nextUrl.origin);
  const res = NextResponse.redirect(homeUrl, { status: 302 });

  // Set the merged session cookie + gate so the home form can resume.
  const sc = sessionCookieValue(merged);
  res.cookies.set({ ...sc, value: encoded });
  res.cookies.set(gateCookieValue());

  return res;
}
