/**
 * POST /api/apply/submit
 *
 * Called from the review form (step 9) when the applicant clicks "Submit Application".
 * 1. Reads the full form data from the signed session cookie.
 * 2. Saves a Lead row to Supabase.
 * 3. If MyInfo was used, saves a MyInfoProfile row.
 * 4. Runs the credit scoring engine.
 * 5. Saves a CreditAssessment row.
 * 6. Updates the session cookie with leadId + approval result.
 * 7. Returns JSON { leadId, approvedLoanAmount, verifiedMonthlyIncome, incomeSource, isEligible }.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  decodeSession,
  encodeSession,
  sessionCookieValue,
  reviewGateCookieValue,
  SESSION_COOKIE,
} from "@/lib/apply-session";
import { initialLoanFormData } from "@/lib/loan-form";
import type { LoanFormData } from "@/lib/loan-form";
import { assessCredit } from "@/lib/credit-score";
import { createAdminClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Accept formData posted directly in the body (preferred — avoids cookie race
  // between the session-save and submit requests).  Fall back to the session
  // cookie so that older callers keep working.
  let bodyData: Partial<LoanFormData> = {};
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      bodyData = (await request.json()) as Partial<LoanFormData>;
    }
  } catch {
    // ignore parse errors; will fall back to cookie
  }
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const sessionData = rawSession ? (decodeSession(rawSession) ?? {}) : {};
  // Body takes precedence over cookie so fresh data is always used.
  const formData = { ...initialLoanFormData, ...sessionData, ...bodyData };

  const admin = createAdminClient();

  // ── 1. Save lead ───────────────────────────────────────────────────────────
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      loan_amount: formData.amount,
      loan_tenure: formData.tenure,
      loan_purpose: formData.loanPurpose || null,
      urgency: formData.urgency || null,
      auth_method: (formData.authMethod || null) as "manual" | "singpass" | null,
      id_type: (formData.idType || null) as "singaporean" | "pr" | "foreigner" | null,
      full_name: formData.fullName || null,
      nric: formData.nric || null,
      email: formData.email || null,
      mobile: formData.mobile || null,
      secondary_mobile: formData.secondaryMobile || null,
      postal_code: formData.postalCode || null,
      address: formData.address || null,
      mailing_address: formData.mailingAddress || null,
      employment_status: formData.employmentStatus || null,
      monthly_income: formData.monthlyIncome || null,
      work_industry: formData.workIndustry || null,
      position: formData.position || null,
      employment_duration: formData.employmentDuration || null,
      office_phone: formData.officePhone || null,
      marital_status: formData.maritalStatus || null,
      bankruptcy_declaration: (formData.bankruptcyDeclaration || null) as "clear" | "discharged_lt5" | "active" | null,
      moneylender_no_loans: formData.moneylenderNoLoans,
      moneylender_loan_amount: formData.moneylenderLoanAmount || null,
      moneylender_payment_history: formData.moneylenderPaymentHistory || null,
      status: "new",
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("Failed to save lead:", leadError);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const leadId = lead.id as string;

  // ── 2. Save MyInfo profile (if SingPass was used) ─────────────────────────
  if (formData.authMethod === "singpass") {
    const noaMonthly =
      formData.noaHistory.length > 0
        ? formData.noaHistory[0].employmentIncome / 12
        : null;

    await admin.from("myinfo_profiles").insert({
      lead_id: leadId,
      nric: formData.nric || null,
      full_name: formData.fullName || null,
      email: formData.email || null,
      mobile: formData.mobile || null,
      address: formData.address || null,
      postal_code: formData.postalCode || null,
      residential_status: formData.idType || null,
      monthly_income_noa: noaMonthly,
      raw_payload: {
        cpfContributions: formData.cpfContributions,
        noaHistory: formData.noaHistory,
        dob: formData.dob,
      },
    });
  }

  // ── 3. Run credit scoring ─────────────────────────────────────────────────
  const assessment = assessCredit({
    dob: formData.dob,
    idType: formData.idType,
    cpfContributions: formData.cpfContributions,
    noaHistory: formData.noaHistory,
    selfDeclaredMonthlyIncome: parseInt(formData.monthlyIncome, 10) || 0,
    requestedLoanAmount: formData.amount,
    moneylenderNoLoans: formData.moneylenderNoLoans,
    moneylenderLoanAmount: formData.moneylenderLoanAmount,
    moneylenderPaymentHistory: formData.moneylenderPaymentHistory,
    authMethod: formData.authMethod,
  });

  // ── 4. Save credit assessment ─────────────────────────────────────────────
  await admin.from("credit_assessments").insert({
    lead_id: leadId,
    income_source: assessment.incomeSource,
    verified_monthly_income: assessment.verifiedMonthlyIncome,
    approved_loan_amount: assessment.approvedLoanAmount,
    max_eligible_loan: assessment.maxEligibleLoan,
    is_eligible: assessment.isEligible,
    age_at_application: assessment.age || null,
    existing_loans: assessment.existingLoans,
    moneylender_loan_amount: assessment.existingLoans > 0 ? assessment.existingLoans : null,
    moneylender_payment_history: formData.moneylenderNoLoans ? null : (formData.moneylenderPaymentHistory || null),
    explanation: assessment.explanation,
    raw_assessment: assessment as unknown as Record<string, unknown>,
  });

  // ── 5. Update session with approval result ────────────────────────────────
  const updatedSession = {
    ...sessionData,
    leadId,
    approvedLoanAmount: assessment.approvedLoanAmount,
    verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
    incomeSource: assessment.incomeSource,
  };
  const encoded = encodeSession(updatedSession);

  const res = NextResponse.json({
    leadId,
    approvedLoanAmount: assessment.approvedLoanAmount,
    verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
    incomeSource: assessment.incomeSource,
    isEligible: assessment.isEligible,
    maxEligibleLoan: assessment.maxEligibleLoan,
    explanation: assessment.explanation,
  });

  const sc = sessionCookieValue(updatedSession);
  res.cookies.set({ ...sc, value: encoded });
  res.cookies.set(reviewGateCookieValue());

  return res;
}
