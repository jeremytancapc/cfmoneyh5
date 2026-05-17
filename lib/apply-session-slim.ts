import type { LoanFormData } from "@/lib/loan-form";

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
