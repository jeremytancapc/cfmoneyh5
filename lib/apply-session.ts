import { cookies } from "next/headers";

import type { LoanFormData } from "./loan-form";

export {
  SESSION_COOKIE,
  GATE_COOKIE,
  REVIEW_GATE_COOKIE,
  DRAFT_LEAD_COOKIE,
  COOKIE_BASE_OPTS,
  POST_SUBMIT_COOKIE_MAX_AGE_SEC,
  encodeSession,
  decodeSession,
  sessionCookieValue,
  gateCookieValue,
  reviewGateCookieValue,
  draftLeadCookieValue,
  clearCookies,
} from "./apply-session-codec";

import {
  SESSION_COOKIE,
  decodeSession,
} from "./apply-session-codec";

export async function getApplySession(): Promise<Partial<LoanFormData> | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}
