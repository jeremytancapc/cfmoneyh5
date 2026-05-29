/**
 * Cookie helpers for the AIP (pre-approved) booking flow at /aip.
 *
 * Intentionally separate from the main apply_ cookies so the two flows
 * never interfere with each other. Uses the same HMAC-signed encoding
 * for consistency.
 */
import { cookies } from "next/headers";
import { encodeSession, decodeSession, COOKIE_BASE_OPTS, POST_SUBMIT_COOKIE_MAX_AGE_SEC } from "./apply-session-codec";

// ─── Cookie names ─────────────────────────────────────────────────────────────

export const AIP_SESSION_COOKIE = "aip_session";
export const AIP_BOOKING_CONFIRM_COOKIE = "aip_booking_confirm";

// ─── Payloads ─────────────────────────────────────────────────────────────────

export type AipSession = {
  mobile: string;
};

export type AipBookingConfirmation = {
  appointmentId: string;
  cfh5Id: string;
  date: string;
  time: string;
};

// ─── Encode / decode ──────────────────────────────────────────────────────────

function encodeAip(data: object): string {
  // Reuse the same codec (base64url + HMAC-SHA256)
  return encodeSession(data as Parameters<typeof encodeSession>[0]);
}

function decodeAip<T extends object>(raw: string): T | null {
  return decodeSession(raw) as T | null;
}

// ─── aip_session cookie ───────────────────────────────────────────────────────

export function aipSessionCookieValue(data: AipSession) {
  return {
    name: AIP_SESSION_COOKIE,
    value: encodeAip(data),
    ...COOKIE_BASE_OPTS,
  };
}

export function decodeAipSession(raw: string): AipSession | null {
  const parsed = decodeAip<Partial<AipSession>>(raw);
  if (!parsed?.mobile) return null;
  return { mobile: parsed.mobile };
}

export function clearAipSessionCookie() {
  return { name: AIP_SESSION_COOKIE, value: "", maxAge: 0, path: "/" };
}

export async function getAipSession(): Promise<AipSession | null> {
  const store = await cookies();
  const raw = store.get(AIP_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeAipSession(raw);
}

// ─── aip_booking_confirm cookie ───────────────────────────────────────────────

const AIP_BOOKING_COOKIE_OPTS = {
  ...COOKIE_BASE_OPTS,
  maxAge: POST_SUBMIT_COOKIE_MAX_AGE_SEC,
} as const;

export function aipBookingConfirmCookieValue(data: AipBookingConfirmation) {
  return {
    name: AIP_BOOKING_CONFIRM_COOKIE,
    value: encodeAip(data),
    ...AIP_BOOKING_COOKIE_OPTS,
  };
}

export function decodeAipBookingConfirmation(raw: string): AipBookingConfirmation | null {
  const parsed = decodeAip<Partial<AipBookingConfirmation>>(raw);
  if (!parsed?.appointmentId || !parsed.cfh5Id || !parsed.date || !parsed.time) return null;
  return {
    appointmentId: parsed.appointmentId,
    cfh5Id: parsed.cfh5Id,
    date: parsed.date,
    time: parsed.time,
  };
}

export async function getAipBookingConfirmation(): Promise<AipBookingConfirmation | null> {
  const store = await cookies();
  const raw = store.get(AIP_BOOKING_CONFIRM_COOKIE)?.value;
  if (!raw) return null;
  return decodeAipBookingConfirmation(raw);
}
