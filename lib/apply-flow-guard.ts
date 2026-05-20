import type { LoanFormData } from "@/lib/loan-form";

/** Steps 4+ (identity → submit) for both manual and Singpass. */
export const APPLY_CONTINUE_PATH = "/apply/review";

/** Singpass MyInfo was merged (activate) — not merely "user tapped Singpass". */
export function hasSingpassMyInfoMerged(
  session: Partial<LoanFormData> | null | undefined,
): boolean {
  return Boolean(session?.nric?.trim() && session?.fullName?.trim());
}

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
  if (auth === "singpass" && !hasSingpassMyInfoMerged(session)) return false;
  return true;
}

/** Session for steps 1–3 on `/` — omit after submit so the form starts fresh. */
export function gateInitialSession(
  session: Partial<LoanFormData> | null | undefined,
): Partial<LoanFormData> | undefined {
  if (!session || session.leadId) return undefined;
  return session;
}

export function hasValidApplyAuthMethod(
  session: Partial<LoanFormData> | null | undefined,
): session is Partial<LoanFormData> & { authMethod: "manual" | "singpass" } {
  return session?.authMethod === "manual" || session?.authMethod === "singpass";
}
