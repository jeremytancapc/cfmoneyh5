import { NextRequest, NextResponse } from "next/server";
import { BOOKING_CONFIRM_COOKIE } from "@/lib/booking-confirmation";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/apply/review")) {
    if (!request.cookies.has("apply_gate")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname === "/apply/book" || pathname.startsWith("/apply/book/")) {
    if (!request.cookies.has("review_gate")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/apply/booked")) {
    if (!request.cookies.has(BOOKING_CONFIRM_COOKIE)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/apply/review",
    "/apply/review/:path*",
    "/apply/book",
    "/apply/book/:path*",
    "/apply/booked",
    "/apply/booked/:path*",
  ],
};
