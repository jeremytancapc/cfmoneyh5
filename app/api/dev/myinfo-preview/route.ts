/**
 * POST /api/dev/myinfo-preview
 *
 * Dev-only endpoint: accepts a raw MyInfo JSON object and returns the
 * LoanFormData patch that buildMyInfoPatch would produce from it.
 * Used by the /auth/callback-result debug page.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildMyInfoPatch } from "@/lib/myinfo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let myinfo: Record<string, unknown> = {};
  try {
    const body = (await request.json()) as { myinfo?: Record<string, unknown> };
    myinfo = body.myinfo ?? (body as Record<string, unknown>);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = buildMyInfoPatch(myinfo);
  return NextResponse.json({ patch });
}
