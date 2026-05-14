import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { saveAuthCallbackPayload } from "@/lib/auth-callback-store";
import { encodeSession } from "@/lib/apply-session";
import type { CpfContribution, LoanFormData, NoaRecord } from "@/lib/loan-form";

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

/** For MyInfo fields that use { code, desc } instead of { value }. */
function strCode(obj: unknown): string {
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if ("code" in o && typeof o.code === "string" && o.code) return o.code;
  }
  return str(obj);
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

  // Date of birth — used for CPF rate calculation
  if (myinfo.dob && typeof myinfo.dob === "object") {
    const dobVal = (myinfo.dob as Record<string, unknown>).value;
    if (typeof dobVal === "string" && dobVal) patch.dob = dobVal;
  }

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
    patch.idType = mapResidentialStatus(strCode(myinfo.residentialstatus));
  }

  // NOA history — all available YA records for scoring
  if (myinfo.noahistory && typeof myinfo.noahistory === "object") {

    const noas = (myinfo.noahistory as Record<string, unknown>).noas;
    if (Array.isArray(noas) && noas.length > 0) {
      patch.noaHistory = noas
        .map((n) => {
          const row = n as Record<string, { value?: string | number }>;
          const ya = String(row.yearofassessment?.value ?? "");
          const income = Number(row.employment?.value ?? row.amount?.value ?? 0);
          return ya && income > 0 ? { yearOfAssessment: ya, employmentIncome: income } : null;
        })
        .filter((r): r is NoaRecord => r !== null);

      // Pre-fill declared income from latest qualifying NOA for the form display
      const latest = patch.noaHistory[0];
      if (latest) {
        patch.monthlyIncome = String(Math.round(latest.employmentIncome / 12));
      }
    }
  }

  // CPF contribution history — used for CPF-based income scoring
  if (myinfo.cpfcontributions && typeof myinfo.cpfcontributions === "object") {

    const history = (myinfo.cpfcontributions as Record<string, unknown>).history;
    if (Array.isArray(history)) {
      patch.cpfContributions = history
        .map((h) => {
          const row = h as Record<string, { value?: string | number }>;
          const month = String(row.month?.value ?? "");
          const amount = Number(row.amount?.value ?? 0);
          return month && amount > 0 ? { month, amount } : null;
        })
        .filter((r): r is CpfContribution => r !== null);
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
  // Raw blobs (CPF, NOA, full MyInfo) stay in the server-side store (keyed by
  // debugRid) and are never put in the cookie to avoid exceeding the 4 KB limit.
  const myinfoPatch = payload.myinfo ? buildMyInfoPatch(payload.myinfo) : {};
  const sessionData: Partial<LoanFormData> = { ...myinfoPatch, singpassRawKey: debugRid };

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
