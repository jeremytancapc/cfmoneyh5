import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { saveAuthCallbackPayload } from "@/lib/auth-callback-store";

function getRequestOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let payload: unknown = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { rawBody };
    }
  }

  const rid = randomUUID();
  saveAuthCallbackPayload(rid, payload);

  const origin = getRequestOrigin(request);
  const redirectUrl = new URL("/auth/callback-result", origin);
  redirectUrl.searchParams.set("rid", rid);

  // Your upstream lambda reads `data` and redirects the browser there.
  return NextResponse.json({
    code: 200,
    message: "success",
    data: redirectUrl.toString(),
  });
}
