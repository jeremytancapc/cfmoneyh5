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

export const runtime = "nodejs";

type RequestBody = {
  formData: Partial<LoanFormData>;
  gate?: "apply" | "review";
};

// POST — save form data and set gate cookie
export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const { formData, gate = "apply" } = body;

  // Merge with existing session so partial updates don't lose earlier fields.
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  const prev = existing ? (decodeSession(existing) ?? {}) : {};
  const merged = { ...prev, ...formData };
  const encoded = encodeSession(merged);

  const res = NextResponse.json({ ok: true });

  // Set session cookie with the new merged value.
  const sc = sessionCookieValue(merged);
  res.cookies.set({ ...sc, value: encoded });

  if (gate === "apply" || gate === "review") {
    if (gate === "apply") {
      res.cookies.set(gateCookieValue());
    } else {
      res.cookies.set(reviewGateCookieValue());
    }
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
