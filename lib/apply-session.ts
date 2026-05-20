import { cookies } from "next/headers";

import type { LoanFormData } from "./loan-form";

export {
  SESSION_COOKIE,
  GATE_COOKIE,
  REVIEW_GATE_COOKIE,
  COOKIE_BASE_OPTS,
  POST_SUBMIT_COOKIE_MAX_AGE_SEC,
  encodeSession,
  decodeSession,
  sessionCookieValue,
  gateCookieValue,
  reviewGateCookieValue,
  clearCookies,
} from "./apply-session-codec";

import { APPROVAL_OFFER_COOKIE } from "@/lib/approval-offer";

import {
  SESSION_COOKIE,
  clearCookies,
  decodeSession,
} from "./apply-session-codec";

export async function getApplySession(): Promise<Partial<LoanFormData> | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

/** Clear apply funnel cookies in a Server Component / Server Action. */
export async function clearApplyCookiesServer(): Promise<void> {
  const store = await cookies();
  for (const c of clearCookies()) {
    store.delete(c.name);
  }
  store.delete(APPROVAL_OFFER_COOKIE);
}
