import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_MYINFO_AUTH_URL =
  "https://4n0hwiuvn0.execute-api.ap-southeast-1.amazonaws.com/stg/auth";

export async function GET(request: NextRequest) {
  const configuredUrl = process.env.MYINFO_AUTH_URL ?? DEFAULT_MYINFO_AUTH_URL;
  const redirectUrl = new URL(configuredUrl);

  // Forward any query params the caller may have added (e.g. custom state).
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl);
}
