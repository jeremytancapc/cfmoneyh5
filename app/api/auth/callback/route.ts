import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { saveAuthCallbackPayload } from "@/lib/auth-callback-store";
import { encodeSession } from "@/lib/apply-session";
import type { LoanFormData } from "@/lib/loan-form";

export const runtime = "nodejs";

type MyInfoPayload = {
  myinfo?: Record<string, unknown>;
  state?: string;
  code?: number;
  message?: string;
};

function getRequestOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";
  return `${proto}://${host}`;
}

function str(obj: unknown): string {
  if (obj && typeof obj === "object" && "value" in obj) {
    const v = (obj as Record<string, unknown>).value;
    return typeof v === "string" ? v : String(v ?? "");
  }
  return "";
}

function mapResidentialStatus(code: string): LoanFormData["idType"] {
  switch (code) {
    case "C": return "singaporean";
    case "P": return "pr";
    default:  return "foreigner";
  }
}

function buildMyInfoPatch(myinfo: Record<string, unknown>): Partial<LoanFormData> {
  const patch: Partial<LoanFormData> = {};

  if (myinfo.name) patch.fullName = str(myinfo.name);
  if (myinfo.uinfin) patch.nric = str(myinfo.uinfin);
  if (myinfo.email) patch.email = str(myinfo.email);

  if (myinfo.mobileno && typeof myinfo.mobileno === "object") {
    const m = myinfo.mobileno as Record<string, { value: string }>;
    const nbr = m.nbr?.value ?? "";
    if (nbr) patch.mobile = nbr;
  }

  if (myinfo.regadd && typeof myinfo.regadd === "object") {
    const a = myinfo.regadd as Record<string, { value?: string }>;
    const block = a.block?.value ?? "";
    const street = a.street?.value ?? "";
    const floor = a.floor?.value ?? "";
    const unit  = a.unit?.value ?? "";
    const postal = (myinfo.regadd as Record<string, { value?: string }>).postal?.value ?? "";
    patch.address = [block, street, floor && unit ? `#${floor}-${unit}` : ""].filter(Boolean).join(" ");
    patch.postalCode = postal;
  }

  if (myinfo.residentialstatus && typeof myinfo.residentialstatus === "object") {
    patch.idType = mapResidentialStatus(str(myinfo.residentialstatus));
  }

  if (myinfo.noahistory && typeof myinfo.noahistory === "object") {
    const noas = (myinfo.noahistory as Record<string, unknown>).noas;
    if (Array.isArray(noas) && noas.length > 0) {
      const latest = noas[0] as Record<string, { value?: number }>;
      const yearlyAmount = latest.employment?.value ?? latest.amount?.value;
      if (typeof yearlyAmount === "number" && yearlyAmount > 0) {
        patch.monthlyIncome = String(Math.round(yearlyAmount / 12));
      }
    }
  }

  patch.authMethod = "singpass";
  return patch;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let payload: MyInfoPayload = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as MyInfoPayload;
    } catch {
      payload = {};
    }
  }

  // Always store full raw payload for the debug result page.
  const debugRid = randomUUID();
  saveAuthCallbackPayload(debugRid, payload);

  // Merge the existing apply_session cookie (if any) with MyInfo data.
  // The browser cookie is NOT available here (server-to-server webhook call),
  // so we only persist the MyInfo fields. The activate route merges them.
  const myinfoPatch = payload.myinfo ? buildMyInfoPatch(payload.myinfo) : {};
  const sessionData: Partial<LoanFormData> = { ...myinfoPatch };

  // Encode the partial session so the activate route can merge + set cookies.
  const activateToken = encodeSession(sessionData);

  const origin = getRequestOrigin(request);
  const activateUrl = new URL("/api/apply/activate", origin);
  activateUrl.searchParams.set("token", activateToken);

  // Lambda reads `data` and redirects the browser there.
  return NextResponse.json({
    code: 200,
    message: "success",
    data: activateUrl.toString(),
  });
}
