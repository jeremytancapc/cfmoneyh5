import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  APPROVAL_OFFER_COOKIE,
  decodeApprovalOffer,
} from "@/lib/approval-offer";
import {
  BOOKING_CONFIRM_COOKIE,
  hasValidBookingConfirmCookie,
} from "@/lib/booking-confirmation";
import {
  GATE_COOKIE,
  getApplySession,
  REVIEW_GATE_COOKIE,
} from "@/lib/apply-session";
import {
  getFunnelRedirectUrl,
  readFunnelContextFromServer,
} from "@/lib/apply-funnel";
import { looksLikeLeadUuid } from "@/lib/lead-id";

function pickLeadQuery(
  raw: string | string[] | undefined,
): string | null {
  const q = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  const trimmed = q?.trim() ?? "";
  return trimmed && looksLikeLeadUuid(trimmed) ? trimmed : null;
}

/**
 * Single server entry: redirect if cookies say the user belongs on another page.
 * Call at the top of `/`, landing variants, and every `/apply/*` page.
 */
export async function enforceApplyFunnel(
  pathname: string,
  searchParams?: { leadId?: string | string[] },
): Promise<void> {
  const session = await getApplySession();
  const cookieStore = await cookies();

  const ctx = readFunnelContextFromServer({
    pathname,
    session,
    hasApplyGate: cookieStore.get(GATE_COOKIE)?.value === "1",
    hasReviewGate: cookieStore.get(REVIEW_GATE_COOKIE)?.value === "1",
    approvalOffer: (() => {
      const raw = cookieStore.get(APPROVAL_OFFER_COOKIE)?.value;
      return raw ? decodeApprovalOffer(raw) : null;
    })(),
    hasBookingConfirm: hasValidBookingConfirmCookie(
      cookieStore.get(BOOKING_CONFIRM_COOKIE)?.value,
    ),
    queryLeadId: pickLeadQuery(searchParams?.leadId),
  });

  const target = getFunnelRedirectUrl(ctx);
  if (target) {
    redirect(target);
  }
}
