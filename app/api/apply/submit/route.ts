/**
 * POST /api/apply/submit  (simulation mode — no Supabase)
 *
 * Reads form data from the request body / session cookie, runs the
 * credit-scoring engine locally, and returns the offer result.
 * No database writes are performed.
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
import { randomUUID } from "crypto";

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
  const formData = { ...initialLoanFormData, ...sessionData, ...bodyData };

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

  // Generate a simulated lead ID (no DB write needed).
  const leadId = randomUUID();

  // Update the session cookie with the result so the results page can read it.
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
