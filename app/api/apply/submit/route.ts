/**
 * POST /api/apply/submit
 *
 * Reads form data from the request body / session cookie, runs the
 * credit-scoring engine, writes a lead + credit assessment to Supabase,
 * and returns the offer result.
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
import type { LeadInsert, CreditAssessmentInsert } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Parse form data from body; fall back to session cookie.
  let bodyData: Partial<LoanFormData> = {};
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      bodyData = (await request.json()) as Partial<LoanFormData>;
    }
  } catch {
    // ignore parse errors
  }

  const rawSession = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const sessionData = rawSession ? (decodeSession(rawSession) ?? {}) : {};
  const formData = { ...initialLoanFormData, ...sessionData, ...bodyData } as LoanFormData;

  // Run the credit-scoring engine on the submitted data.
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

  // ── Write lead to Supabase ─────────────────────────────────────────────────
  const db = createAdminClient();

  const leadInsert: LeadInsert = {
    loan_amount: formData.amount,
    loan_tenure: formData.tenure,
    loan_purpose: formData.loanPurpose || null,
    urgency: formData.urgency || null,

    auth_method: (formData.authMethod as LeadInsert["auth_method"]) || null,
    id_type: (formData.idType as LeadInsert["id_type"]) || null,
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
    bankruptcy_declaration:
      (formData.bankruptcyDeclaration as LeadInsert["bankruptcy_declaration"]) || null,
    moneylender_no_loans: formData.moneylenderNoLoans,
    moneylender_loan_amount: formData.moneylenderLoanAmount || null,
    moneylender_payment_history: formData.moneylenderPaymentHistory || null,

    status: "new",
    notes: null,
    assigned_to: null,
  };

  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert(leadInsert)
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("Failed to insert lead:", leadError);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const leadId = lead.id;

  // ── Write credit assessment to Supabase ───────────────────────────────────
  const assessmentInsert: CreditAssessmentInsert = {
    lead_id: leadId,
    income_source: assessment.incomeSource,
    verified_monthly_income: assessment.verifiedMonthlyIncome,
    approved_loan_amount: assessment.approvedLoanAmount,
    max_eligible_loan: assessment.maxEligibleLoan,
    is_eligible: assessment.isEligible,
    age_at_application: assessment.age ?? null,
    existing_loans: assessment.existingLoans ?? 0,
    moneylender_loan_amount:
      formData.moneylenderLoanAmount ? parseFloat(formData.moneylenderLoanAmount) : null,
    moneylender_payment_history: formData.moneylenderPaymentHistory || null,
    explanation: assessment.explanation ?? null,
    raw_assessment: assessment as unknown as Record<string, unknown>,
  };

  const { error: assessmentError } = await db
    .from("credit_assessments")
    .insert(assessmentInsert);

  if (assessmentError) {
    // Non-fatal — lead is already saved; log and continue.
    console.error("Failed to insert credit assessment:", assessmentError);
  }

  // ── Update session cookie with result ─────────────────────────────────────
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
