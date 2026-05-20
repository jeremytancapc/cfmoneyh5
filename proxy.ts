import { NextRequest, NextResponse } from "next/server";

import {
  getFunnelRedirectUrl,
  hasPostSubmitAccess,
  readFunnelContextFromRequest,
} from "@/lib/apply-funnel";

export function proxy(request: NextRequest) {
  const ctx = readFunnelContextFromRequest(request);
  const target = getFunnelRedirectUrl(ctx);

  if (target) {
    const url = new URL(target, request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
