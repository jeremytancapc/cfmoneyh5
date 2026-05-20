import { cookies } from "next/headers";

import { decodeSession, encodeSession } from "@/lib/apply-session-codec";

export const BOOKING_CONFIRM_COOKIE = "booking_confirm";

/** How long `booking_confirm` persists (seconds). Default 30 days. */
export const BOOKING_CONFIRM_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type StoredBookingConfirmation = {
  appointmentId: string;
  cfh5Id: string;
  loanAmount: number;
  date: string;
  time: string;
  idType?: string;
};

const BOOKING_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: BOOKING_CONFIRM_MAX_AGE_SEC,
} as const;

export function bookingConfirmCookieValue(data: StoredBookingConfirmation) {
  return {
    name: BOOKING_CONFIRM_COOKIE,
    value: encodeSession(data as Parameters<typeof encodeSession>[0]),
    ...BOOKING_COOKIE_OPTS,
  };
}

export function decodeBookingConfirmation(raw: string): StoredBookingConfirmation | null {
  const parsed = decodeSession(raw) as Partial<StoredBookingConfirmation> | null;
  if (!parsed?.cfh5Id || !parsed.date || !parsed.time || !parsed.appointmentId) {
    return null;
  }
  return {
    appointmentId: parsed.appointmentId,
    cfh5Id: parsed.cfh5Id,
    loanAmount: Number(parsed.loanAmount) || 0,
    date: parsed.date,
    time: parsed.time,
    idType: parsed.idType,
  };
}

export function hasValidBookingConfirmCookie(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return decodeBookingConfirmation(raw) !== null;
}

export async function getBookingConfirmation(): Promise<StoredBookingConfirmation | null> {
  const store = await cookies();
  const raw = store.get(BOOKING_CONFIRM_COOKIE)?.value;
  if (!raw) return null;
  return decodeBookingConfirmation(raw);
}

export async function clearBookingConfirmServer(): Promise<void> {
  const store = await cookies();
  store.delete(BOOKING_CONFIRM_COOKIE);
}
