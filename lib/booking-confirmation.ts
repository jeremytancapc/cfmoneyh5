import { cookies } from "next/headers";
import { decodeSession, encodeSession } from "@/lib/apply-session";

export const BOOKING_CONFIRM_COOKIE = "booking_confirm";

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
  maxAge: 60 * 60 * 24 * 30,
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

export async function getBookingConfirmation(): Promise<StoredBookingConfirmation | null> {
  const store = await cookies();
  const raw = store.get(BOOKING_CONFIRM_COOKIE)?.value;
  if (!raw) return null;
  return decodeBookingConfirmation(raw);
}
