import { APPLY_TRACE_ID_KEY } from "@/lib/apply-flow-log";
import type { LoanFormData } from "@/lib/loan-form";

type SessionWithTrace = Partial<LoanFormData> & { applyTraceId?: string };

/**
 * Session cookie after Singpass activate — identity + loan fields only.
 * Full CPF/NOA live in myinfo_profiles (keyed by draft_lead) and are hydrated
 * on /apply/review. singpassRawKey stays for short-lived auth-callback-store fallback.
 */
export function buildActivateSessionCookie(
  merged: SessionWithTrace,
): SessionWithTrace {
  return {
    amount: merged.amount,
    tenure: merged.tenure,
    urgency: merged.urgency,
    authMethod: merged.authMethod,
    idType: merged.idType,
    fullName: merged.fullName,
    nric: merged.nric,
    email: merged.email,
    mobile: merged.mobile,
    secondaryMobile: merged.secondaryMobile,
    postalCode: merged.postalCode,
    address: merged.address,
    loanPurpose: merged.loanPurpose,
    monthlyIncome: merged.monthlyIncome,
    maritalStatus: merged.maritalStatus,
    dob: merged.dob,
    singpassRawKey: merged.singpassRawKey,
    [APPLY_TRACE_ID_KEY]: merged[APPLY_TRACE_ID_KEY],
    cpfContributions: [],
    noaHistory: [],
  };
}

/**
 * Strip heavy MyInfo arrays from the session cookie after submit so Set-Cookie
 * stays under the browser ~4 KB limit (common on Singpass flows).
 */
export function buildPostSubmitSession(
  session: Partial<LoanFormData>,
  leadId: string,
  assessment: {
    approvedLoanAmount: number;
    verifiedMonthlyIncome: number;
    incomeSource: LoanFormData["incomeSource"];
  },
): Partial<LoanFormData> {
  return {
    amount: session.amount,
    tenure: session.tenure,
    urgency: session.urgency,
    authMethod: session.authMethod,
    idType: session.idType,
    fullName: session.fullName,
    nric: session.nric,
    email: session.email,
    mobile: session.mobile,
    secondaryMobile: session.secondaryMobile,
    postalCode: session.postalCode,
    address: session.address,
    loanPurpose: session.loanPurpose,
    monthlyIncome: session.monthlyIncome,
    maritalStatus: session.maritalStatus,
    leadId,
    approvedLoanAmount: assessment.approvedLoanAmount,
    verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
    incomeSource: assessment.incomeSource,
    cpfContributions: [],
    noaHistory: [],
    singpassRawKey: "",
  };
}
