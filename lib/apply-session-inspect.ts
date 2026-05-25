/**
 * Helpers for Singpass session / cookie budget tests (unit + integration scripts).
 */

import { COOKIE_SIZE_WARN_BYTES } from "./apply-flow-log";
import { decodeSession, encodeSession } from "./apply-session-codec";
import {
  canEnterReview,
  getFunnelRedirectUrl,
  type ApplyFunnelContext,
} from "./apply-funnel";
import { buildMyInfoPatch } from "./myinfo";
import type { LoanFormData } from "./loan-form";
import { buildActivateSessionCookie } from "./apply-session-slim";

/** Conservative browser limit for a single cookie value (Set-Cookie). */
export const BROWSER_COOKIE_MAX_BYTES = 4096;

export type SessionInspect = {
  bytes: number;
  decodeOk: boolean;
  canEnterReview: boolean;
  hasNric: boolean;
  hasFullName: boolean;
  cpfCount: number;
  noaCount: number;
  exceedsBrowserMax: boolean;
  exceedsWarnThreshold: boolean;
};

export function inspectEncodedSession(encoded: string): SessionInspect {
  const session = decodeSession(encoded);
  return {
    bytes: encoded.length,
    decodeOk: session !== null,
    canEnterReview: canEnterReview(session),
    hasNric: Boolean(session?.nric?.trim()),
    hasFullName: Boolean(session?.fullName?.trim()),
    cpfCount: session?.cpfContributions?.length ?? 0,
    noaCount: session?.noaHistory?.length ?? 0,
    exceedsBrowserMax: encoded.length > BROWSER_COOKIE_MAX_BYTES,
    exceedsWarnThreshold: encoded.length >= COOKIE_SIZE_WARN_BYTES,
  };
}

/** Same merge as GET /api/apply/activate (pre-Singpass cookie + MyInfo token patch). */
export function mergeActivateSession(
  preSingpass: Partial<LoanFormData>,
  myinfo: Record<string, unknown>,
): { merged: Partial<LoanFormData>; encoded: string; inspect: SessionInspect } {
  const patch = buildMyInfoPatch(myinfo);
  const merged: Partial<LoanFormData> = { ...preSingpass, ...patch };
  const slim = buildActivateSessionCookie(merged);
  const encoded = encodeSession(slim);
  return { merged, encoded, inspect: inspectEncodedSession(encoded) };
}

export function funnelRedirectForReviewSession(
  session: Partial<LoanFormData> | null,
  pathname: string,
): string | null {
  const ctx: ApplyFunnelContext = {
    pathname,
    session,
    hasApplyGate: true,
    hasReviewGate: false,
    approvalOffer: null,
    hasBookingConfirm: false,
    queryLeadId: null,
  };
  return getFunnelRedirectUrl(ctx);
}
