import type { NextRequest } from "next/server";

import {
  APPROVAL_OFFER_COOKIE,
  decodeApprovalOffer,
  hasValidApprovalOfferCookie,
  type StoredApprovalOffer,
} from "@/lib/approval-offer";
import {
  BOOKING_CONFIRM_COOKIE,
  hasValidBookingConfirmCookie,
} from "@/lib/booking-confirmation";
import {
  decodeSession,
  GATE_COOKIE,
  REVIEW_GATE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/apply-session-codec";
import type { LoanFormData } from "@/lib/loan-form";
import { looksLikeLeadUuid } from "@/lib/lead-id";
import { postSubmitUrl } from "@/lib/post-submit-nav";

/** Canonical funnel step derived from cookies + session. */
export type ApplyFunnelStage =
  | "landing"
  | "review"
  | "approval"
  | "book"
  | "booked"
  | "pending";

export type ApplyFunnelContext = {
  pathname: string;
  session: Partial<LoanFormData> | null;
  hasApplyGate: boolean;
  /** Set after eligible submit — allows /apply/book (not the review page). */
  hasReviewGate: boolean;
  approvalOffer: StoredApprovalOffer | null;
  hasBookingConfirm: boolean;
  queryLeadId: string | null;
};

/** Post-submit: approval page + book page (30-day cookies). */
export function hasPostSubmitAccess(ctx: ApplyFunnelContext): boolean {
  return ctx.hasReviewGate || Boolean(ctx.approvalOffer);
}

const LANDING_PATHS = new Set(["/", "/foreigner", "/vcsa-sg"]);

export function hasSingpassMyInfoMerged(
  session: Partial<LoanFormData> | null | undefined,
): boolean {
  return Boolean(session?.nric?.trim() && session?.fullName?.trim());
}

export function hasValidApplyAuthMethod(
  session: Partial<LoanFormData> | null | undefined,
): session is Partial<LoanFormData> & { authMethod: "manual" | "singpass" } {
  return session?.authMethod === "manual" || session?.authMethod === "singpass";
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function pickLeadId(ctx: ApplyFunnelContext): string | null {
  const fromSession =
    typeof ctx.session?.leadId === "string" && ctx.session.leadId.length > 0
      ? ctx.session.leadId.trim()
      : null;
  return fromSession ?? ctx.queryLeadId ?? ctx.approvalOffer?.leadId ?? null;
}

function isApproved(ctx: ApplyFunnelContext): boolean {
  if (Number(ctx.session?.approvedLoanAmount) > 0) return true;
  return Number(ctx.approvalOffer?.approvedLoanAmount) > 0;
}

/** User may enter steps 4–9 on /apply/review. */
export function canEnterReview(session: Partial<LoanFormData> | null): boolean {
  if (!session || !hasValidApplyAuthMethod(session)) return false;
  const income = session.monthlyIncome?.trim() ?? "";
  if (!session.amount || income === "") return false;
  if (session.authMethod === "singpass" && !hasSingpassMyInfoMerged(session)) {
    return false;
  }
  return true;
}

export function resolveApplyFunnelStage(ctx: ApplyFunnelContext): ApplyFunnelStage {
  const path = normalizePath(ctx.pathname);

  if (ctx.hasBookingConfirm) {
    return "booked";
  }

  if (path.startsWith("/apply/pending") && ctx.queryLeadId) {
    return "pending";
  }

  const leadId = pickLeadId(ctx);

  if (leadId) {
    if (isApproved(ctx)) {
      if (path.startsWith("/apply/book") && hasPostSubmitAccess(ctx)) return "book";
      return "approval";
    }
    return "pending";
  }

  if (ctx.hasApplyGate && canEnterReview(ctx.session)) {
    return "review";
  }

  return "landing";
}

export function canonicalPathForStage(
  stage: ApplyFunnelStage,
  leadId: string | null,
): string {
  switch (stage) {
    case "booked":
      return "/apply/booked";
    case "book":
      return "/apply/book";
    case "approval":
      return postSubmitUrl("/apply/approval", leadId);
    case "pending":
      return postSubmitUrl("/apply/pending", leadId);
    case "review":
      return "/apply/review";
    default:
      return "/";
  }
}

function pathMatchesStage(path: string, stage: ApplyFunnelStage): boolean {
  switch (stage) {
    case "booked":
      return path.startsWith("/apply/booked");
    case "book":
      return path.startsWith("/apply/book");
    case "approval":
      return path.startsWith("/apply/approval");
    case "pending":
      return path.startsWith("/apply/pending");
    case "review":
      return path.startsWith("/apply/review");
    case "landing":
      return LANDING_PATHS.has(path) || path === "/apply";
    default:
      return false;
  }
}

/**
 * If the user is on the wrong page for their cookie state, return the URL they should be on.
 * Otherwise return null (allow request).
 */
export function getFunnelRedirectUrl(ctx: ApplyFunnelContext): string | null {
  const path = normalizePath(ctx.pathname);
  const stage = resolveApplyFunnelStage(ctx);
  const leadId = pickLeadId(ctx);

  // Booked: always show confirmation until `booking_confirm` expires (no new application).
  if (stage === "booked" && !path.startsWith("/apply/booked")) {
    return canonicalPathForStage("booked", leadId);
  }

  // Gate landings (`/`, `/foreigner`, `/vcsa-sg`) are interchangeable when stage is landing.
  if (stage === "landing" && !path.startsWith("/apply/")) {
    return null;
  }

  if (pathMatchesStage(path, stage)) {
    return null;
  }

  // Book: allow approval while offer not yet accepted (same session stage).
  if (stage === "book" && path.startsWith("/apply/approval")) {
    return null;
  }

  // Pending: only valid with ?leadId= (cookies cleared on that page).
  if (stage === "pending" && path.startsWith("/apply/pending") && !ctx.queryLeadId) {
    return "/";
  }

  return canonicalPathForStage(stage, leadId);
}

export function readFunnelContextFromRequest(request: NextRequest): ApplyFunnelContext {
  const pathname = request.nextUrl.pathname;
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = rawSession ? decodeSession(rawSession) : null;
  const q = request.nextUrl.searchParams.get("leadId")?.trim() ?? "";
  const queryLeadId = q && looksLikeLeadUuid(q) ? q : null;

  return {
    pathname,
    session,
    hasApplyGate: request.cookies.get(GATE_COOKIE)?.value === "1",
    hasReviewGate: request.cookies.get(REVIEW_GATE_COOKIE)?.value === "1",
    approvalOffer: (() => {
      const raw = request.cookies.get(APPROVAL_OFFER_COOKIE)?.value;
      return raw ? decodeApprovalOffer(raw) : null;
    })(),
    hasBookingConfirm: hasValidBookingConfirmCookie(
      request.cookies.get(BOOKING_CONFIRM_COOKIE)?.value,
    ),
    queryLeadId,
  };
}

export type ServerFunnelInput = {
  pathname: string;
  session: Partial<LoanFormData> | null;
  hasApplyGate: boolean;
  hasReviewGate: boolean;
  approvalOffer?: StoredApprovalOffer | null;
  hasBookingConfirm: boolean;
  queryLeadId?: string | null;
};

export function readFunnelContextFromServer(input: ServerFunnelInput): ApplyFunnelContext {
  const q = input.queryLeadId?.trim() ?? "";
  return {
    pathname: input.pathname,
    session: input.session,
    hasApplyGate: input.hasApplyGate,
    hasReviewGate: input.hasReviewGate,
    approvalOffer: input.approvalOffer ?? null,
    hasBookingConfirm: input.hasBookingConfirm,
    queryLeadId: q && looksLikeLeadUuid(q) ? q : null,
  };
}
