import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/apply/review")) {
    if (!request.cookies.has("apply_gate")) {
      return NextResponse.redirect(new URL("/apply", request.url));
    }
  }

  if (pathname.startsWith("/apply/book")) {
    if (!request.cookies.has("review_gate")) {
      return NextResponse.redirect(new URL("/apply", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/apply/review/:path*", "/apply/book/:path*"],
};
