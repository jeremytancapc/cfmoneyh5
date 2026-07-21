/**
 * POST /api/axs/submit
 *
 * Called by the AXS partner app with MyInfo + employment data.
 * 1. Validates AXS partner API key
 * 2. Creates a lead (auth_method: "axs")
 * 3. Saves MyInfo profile
 * 4. Runs AirConnect eligibility check
 * 5. Runs credit scoring
 * 6. If approved → generates a signed booking token/URL
 * 7. Returns status + approved amount + booking URL to AXS
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { checkLeadEligibility } from "@/lib/eligibility-check";
import { assessCredit } from "@/lib/credit-score";
import { deriveCreditRejectionReason } from "@/lib/credit-rejection";
import { createAxsToken } from "@/lib/axs-token";
import { logExternalApi } from "@/lib/external-api-logger";
import type { CpfContribution, NoaRecord } from "@/lib/loan-form";

export const runtime = "nodejs";

const LOG = "[axs/submit]";
const DEFAULT_TENURE = 12;

// ── Request body types ────────────────────────────────────────────────────────

interface AxsEmployment {
  "org-name"?: string;
  "job-title"?: string;
  "years-in-service"?: number;
  "business-nature"?: string;
}

interface AxsMyInfoPayload {
  uinfin?: { value?: string };
  name?: { value?: string };
  sex?: { code?: string; desc?: string };
  nationality?: { code?: string; desc?: string };
  dob?: { value?: string };
  residentialstatus?: { code?: string };
  email?: { value?: string };
  mobileno?: { areacode?: { value?: string }; prefix?: { value?: string }; nbr?: { value?: string } };
  regadd?: {
    unit?: { value?: string };
    street?: { value?: string };
    block?: { value?: string };
    postal?: { value?: string };
    floor?: { value?: string };
    building?: { value?: string };
  };
  marital?: { code?: string; desc?: string };
  cpfcontributions?: { history?: Array<{
    date?: { value?: string };
    employer?: { value?: string };
    amount?: { value?: number };
    month?: { value?: string };
  }> };
  "noa-basic"?: { yearofassessment?: { value?: string }; amount?: { value?: number } };
  axs?: {
    "reference-id"?: string;
    "education-level"?: string;
    "occupation-type"?: string;
    employments?: AxsEmployment[];
    loan_amount?: number;
    tenure?: number;
  };
}

interface AxsRequestBody {
  myinfo: AxsMyInfoPayload;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractPhone(mobileno: AxsMyInfoPayload["mobileno"]): string {
  if (!mobileno?.nbr?.value) return "";
  const prefix = mobileno.prefix?.value ?? "+";
  const area = mobileno.areacode?.value ?? "65";
  return `${prefix}${area}${mobileno.nbr.value}`;
}

function extractAddress(regadd: AxsMyInfoPayload["regadd"]): string {
  if (!regadd) return "";
  const parts = [
    regadd.block?.value ? `Blk ${regadd.block.value}` : "",
    regadd.street?.value ?? "",
    regadd.floor?.value && regadd.unit?.value ? `#${regadd.floor.value}-${regadd.unit.value}` : "",
    regadd.building?.value ?? "",
  ].filter(Boolean);
  return parts.join(" ");
}

function extractCpfContributions(history: AxsMyInfoPayload["cpfcontributions"]): CpfContribution[] {
  if (!history?.history?.length) return [];
  return history.history.map((h) => ({
    month: h.month?.value ?? "",
    amount: h.amount?.value ?? 0,
    employer: h.employer?.value ?? "",
    paidOn: h.date?.value ?? "",
  }));
}

function extractNoaHistory(noa: AxsMyInfoPayload["noa-basic"]): NoaRecord[] {
  if (!noa?.amount?.value) return [];
  // noa-basic.yearofassessment.value might be "2,024.00" — parse it
  const yaRaw = String(noa.yearofassessment?.value ?? "").replace(/,/g, "");
  const ya = String(Math.round(parseFloat(yaRaw) || 0));
  return [{
    yearOfAssessment: ya,
    type: "ORIGINAL",
    taxClearance: "N",
    assessableIncome: noa.amount.value,
    employmentIncome: noa.amount.value,
    tradeIncome: 0,
    rentIncome: 0,
    interestIncome: 0,
  }];
}

function determineIdType(nationality?: string): string {
  if (!nationality) return "singaporean";
  const code = nationality.toUpperCase();
  if (code === "SG") return "singaporean";
  // PR detection would need residentialstatus; for now treat non-SG as foreigner
  return "foreigner";
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Validate API key
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const expectedKey = process.env.AXS_PARTNER_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    console.warn(`${LOG} reject: invalid API key`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: AxsRequestBody;
  try {
    body = (await request.json()) as AxsRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const myinfo = body.myinfo;
  if (!myinfo) {
    return NextResponse.json({ error: "Missing myinfo object" }, { status: 400 });
  }

  const nric = myinfo.uinfin?.value ?? "";
  const fullName = myinfo.name?.value ?? "";
  const dob = myinfo.dob?.value ?? "";
  const mobile = extractPhone(myinfo.mobileno);
  const email = myinfo.email?.value ?? "";
  const address = extractAddress(myinfo.regadd);
  const postalCode = myinfo.regadd?.postal?.value ?? "";
  const axsRef = myinfo.axs?.["reference-id"] ?? "";
  const nationalityCode = myinfo.nationality?.code ?? "";
  const idType = determineIdType(nationalityCode);
  const requestedLoanAmount = myinfo.axs?.loan_amount ?? 20000;
  const requestedTenure = myinfo.axs?.tenure ?? DEFAULT_TENURE;

  console.info(`${LOG} processing`, { nric: nric.slice(0, 2) + "***", fullName, axsRef, idType });

  if (!nric) {
    return NextResponse.json({ error: "Missing uinfin (NRIC/FIN)" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Create lead
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      auth_method: "axs",
      full_name: fullName || null,
      nric: nric || null,
      mobile: mobile || null,
      email: email || null,
      address: address || null,
      postal_code: postalCode || null,
      id_type: idType === "foreigner" ? "foreigner" : "singaporean",
      loan_amount: requestedLoanAmount,
      loan_tenure: requestedTenure,
      moneylender_no_loans: true, // Not asking for AXS
      status: "new",
    })
    .select("id")
    .single();

  if (leadError || !lead?.id) {
    console.error(`${LOG} insert lead failed`, leadError);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }

  const leadId = lead.id as string;
  console.info(`${LOG} lead created`, { leadId, axsRef });

  // 4. Save MyInfo profile
  const cpfContributions = extractCpfContributions(myinfo.cpfcontributions);
  const noaHistory = extractNoaHistory(myinfo["noa-basic"]);

  await admin.from("myinfo_profiles").insert({
    lead_id: leadId,
    nric,
    full_name: fullName || null,
    email: email || null,
    mobile: mobile || null,
    address: address || null,
    postal_code: postalCode || null,
    raw_payload: myinfo as unknown as Record<string, unknown>,
  });

  // 5. Eligibility check
  const eligibility = await checkLeadEligibility({
    phoneNumber: mobile,
    idNumber: nric,
    leadId,
  });

  await admin.from("leads").update({
    eligibility_status: eligibility.status,
    eligibility_notes: eligibility.notes,
    eligibility_reloan_reason: eligibility.reloanReason,
  }).eq("id", leadId);

  if (eligibility.status === "NOT_ELIGIBLE" || eligibility.status === "RELOAN") {
    console.info(`${LOG} rejected by eligibility`, { leadId, status: eligibility.status });
    await admin.from("leads").update({ status: "rejected" }).eq("id", leadId);

    return NextResponse.json({
      status: "rejected",
      reason: eligibility.status === "RELOAN" ? "airconnect_reloan" : "airconnect_not_eligible",
      notes: eligibility.notes,
      leadId,
      axsRef,
    });
  }

  // 6. Credit scoring
  const assessment = assessCredit({
    dob,
    idType,
    cpfContributions,
    noaHistory,
    selfDeclaredMonthlyIncome: 0,
    requestedLoanAmount,
    moneylenderNoLoans: true,
    moneylenderLoanAmount: "",
    moneylenderPaymentHistory: "",
    authMethod: "singpass", // Treat as verified since we have MyInfo data
  });

  const creditRejectionReason = deriveCreditRejectionReason(assessment);

  // Save credit assessment
  await admin.from("credit_assessments").insert({
    lead_id: leadId,
    income_source: assessment.incomeSource,
    verified_monthly_income: assessment.verifiedMonthlyIncome,
    approved_loan_amount: assessment.approvedLoanAmount,
    max_eligible_loan: assessment.maxEligibleLoan,
    is_eligible: assessment.isEligible,
    credit_rejection_reason: creditRejectionReason,
    age_at_application: assessment.age || null,
    existing_loans: 0,
    explanation: assessment.explanation,
    raw_assessment: assessment as unknown as Record<string, unknown>,
  });

  // Update lead with approved amount
  const approvedAmount = assessment.approvedLoanAmount;
  await admin.from("leads").update({
    loan_amount: approvedAmount,
    status: assessment.isEligible ? "approved" : "rejected",
  }).eq("id", leadId);

  if (!assessment.isEligible || approvedAmount <= 0) {
    console.info(`${LOG} credit declined`, { leadId, axsRef, reason: creditRejectionReason });
    return NextResponse.json({
      status: "rejected",
      reason: creditRejectionReason ?? "credit_declined",
      notes: assessment.explanation,
      verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
      maxEligibleLoan: assessment.maxEligibleLoan,
      leadId,
      axsRef,
    });
  }

  // 7. Generate booking token
  const token = createAxsToken({
    leadId,
    axsRef,
    approvedAmount,
    tenure: requestedTenure,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://apply.crawfort.com";
  const bookingUrl = `${baseUrl}/axs/book?token=${token}`;

  console.info(`${LOG} approved`, {
    leadId,
    axsRef,
    approvedAmount,
    maxEligibleLoan: assessment.maxEligibleLoan,
    verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
    incomeSource: assessment.incomeSource,
    requestedLoanAmount,
    requestedTenure,
  });

  return NextResponse.json({
    status: "approved",
    approvedLoanAmount: approvedAmount,
    maxEligibleLoan: assessment.maxEligibleLoan,
    tenure: requestedTenure,
    verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
    incomeSource: assessment.incomeSource,
    bookingUrl,
    leadId,
    axsRef,
  });
}
