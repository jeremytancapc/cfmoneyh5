import type { LoanFormData } from "@/lib/loan-form";

/** Steps 4+ (identity → submit) for both manual and Singpass. */
export const APPLY_CONTINUE_PATH = "/apply/review";

export function shouldRedirectToApplyContinue(
  session: Partial<LoanFormData> | null | undefined,
  hasApplyGate: boolean,
): boolean {
  if (!session || !hasApplyGate) return false;
  if (session.leadId) return false;
  const auth = session.authMethod;
  if (auth !== "manual" && auth !== "singpass") return false;
  const income = session.monthlyIncome?.trim() ?? "";
  if (!session.amount || income === "") return false;
  return true;
}

export function hasValidApplyAuthMethod(
  session: Partial<LoanFormData> | null | undefined,
): session is Partial<LoanFormData> & { authMethod: "manual" | "singpass" } {
  return session?.authMethod === "manual" || session?.authMethod === "singpass";
}
