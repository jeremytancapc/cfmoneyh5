import type { LoanFormData } from "@/lib/loan-form";

/** Remove post-submit fields so a new application at step 3 does not inherit an old lead. */
export function stripPostSubmitSessionFields(
  data: Partial<LoanFormData>,
): Partial<LoanFormData> {
  return {
    ...data,
    leadId: "",
    approvedLoanAmount: 0,
    verifiedMonthlyIncome: 0,
    incomeSource: "",
    cpfContributions: [],
    noaHistory: [],
    singpassRawKey: "",
  };
}
