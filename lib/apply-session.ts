import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { LoanFormData } from "./loan-form";

export const SESSION_COOKIE = "apply_session";
export const GATE_COOKIE = "apply_gate";
export const REVIEW_GATE_COOKIE = "review_gate";

const COOKIE_BASE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60, // 1 hour
} as const;

function secret(): string {
  return process.env.APPLY_SESSION_SECRET ?? "dev-insecure-secret-32chars-xx";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(data: Partial<LoanFormData>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string): Partial<LoanFormData> | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  // Constant-time comparison to prevent timing attacks.
  const expected = sign(payload);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<LoanFormData>;
  } catch {
    return null;
  }
}

export async function getApplySession(): Promise<Partial<LoanFormData> | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

/** Build a Set-Cookie-compatible object for NextResponse.cookies.set() */
export function sessionCookieValue(data: Partial<LoanFormData>) {
  return { name: SESSION_COOKIE, value: encodeSession(data), ...COOKIE_BASE_OPTS };
}

export function gateCookieValue() {
  return { name: GATE_COOKIE, value: "1", ...COOKIE_BASE_OPTS };
}

export function reviewGateCookieValue() {
  return { name: REVIEW_GATE_COOKIE, value: "1", ...COOKIE_BASE_OPTS };
}

export function clearCookies() {
  const expire = { maxAge: 0, path: "/" };
  return [
    { name: SESSION_COOKIE, value: "", ...expire },
    { name: GATE_COOKIE, value: "", ...expire },
    { name: REVIEW_GATE_COOKIE, value: "", ...expire },
  ];
}
