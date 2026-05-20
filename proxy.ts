import { NextRequest, NextResponse } from "next/server";

import { applyClearApplyCookiesOnResponse } from "@/lib/clear-apply-cookies-response";
import {
  getFunnelRedirectUrl,
  readFunnelContextFromRequest,
} from "@/lib/apply-funnel";
import { looksLikeLeadUuid } from "@/lib/lead-id";

function isPendingWithLeadId(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/apply/pending")) return false;
  const q = request.nextUrl.searchParams.get("leadId")?.trim() ?? "";
  return Boolean(q && looksLikeLeadUuid(q));
}

export function proxy(request: NextRequest) {
  const ctx = readFunnelContextFromRequest(request);
  const target = getFunnelRedirectUrl(ctx);
  const clearPendingCookies = isPendingWithLeadId(request);

  if (target) {
    const url = new URL(target, request.url);
    const res = NextResponse.redirect(url);
    if (clearPendingCookies) {
      applyClearApplyCookiesOnResponse(res);
    }
    return res;
  }

  const res = NextResponse.next();
  if (clearPendingCookies) {
    applyClearApplyCookiesOnResponse(res);
  }
  return res;
}

export const config = {
  matcher: [
    "/",
    "/foreigner",
    "/foreigner/:path*",
    "/vcsa-sg",
    "/vcsa-sg/:path*",
    "/apply/review",
    "/apply/review/:path*",
    "/apply/approval",
    "/apply/approval/:path*",
    "/apply/pending",
    "/apply/pending/:path*",
    "/apply/book",
    "/apply/book/:path*",
    "/apply/booked",
    "/apply/booked/:path*",
  ],
};
