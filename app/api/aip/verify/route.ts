/**
 * POST /api/aip/verify
 *
 * Validates the mobile number supplied on the AIP landing page.
 * Currently always approves any valid Singapore mobile (8-digit starting with 8 or 9).
 * A real pre-approval lookup can be wired in later without changing the UI contract.
 *
 * On success: sets aip_session cookie { mobile } and returns { ok: true }.
 */
import { NextRequest, NextResponse } from "next/server";
import { aipSessionCookieValue } from "@/lib/aip-session";

export const runtime = "nodejs";

const LOG = "[aip/verify]";

const SG_MOBILE_RE = /^[89]\d{7}$/;

type Body = { mobile: string };

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<Body>;
  const raw = (body.mobile ?? "").replace(/\s/g, "");

  console.info(`${LOG} POST`, { rawLength: raw.length });

  if (!SG_MOBILE_RE.test(raw)) {
    console.warn(`${LOG} reject: invalid SG mobile format`);
    return NextResponse.json(
      { error: "Please enter a valid 8-digit Singapore mobile number." },
      { status: 422 },
    );
  }

  // Pre-approval lookup placeholder — always returns true for now.
  const isPreApproved = true;

  if (!isPreApproved) {
    console.warn(`${LOG} reject: not pre-approved`, { mobile: raw.slice(0, 4) + "****" });
    return NextResponse.json(
      { error: "We could not find a pre-approved offer for this number. Please contact us directly." },
      { status: 404 },
    );
  }

  console.info(`${LOG} verified — setting aip_session`, { mobile: raw.slice(0, 4) + "****" });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(aipSessionCookieValue({ mobile: raw }));
  return res;
}
