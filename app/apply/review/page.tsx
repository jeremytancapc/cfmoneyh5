import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { GATE_COOKIE, getApplySession } from "@/lib/apply-session";
import {
  hasSingpassMyInfoMerged,
  hasValidApplyAuthMethod,
} from "@/lib/apply-flow-guard";
import { postSubmitUrl } from "@/lib/post-submit-nav";
import { initialLoanFormData, type LoanFormData } from "@/lib/loan-form";

import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

/**
 * Unified continuation after step 3 (manual or Singpass).
 * Steps 4–9 only run here — not on `/`.
 */
export default async function ReviewPage() {
  const session = await getApplySession();
  const cookieStore = await cookies();
  const hasApplyGate = cookieStore.get(GATE_COOKIE)?.value === "1";

  if (!session || !hasApplyGate || !hasValidApplyAuthMethod(session)) {
    redirect("/");
  }

  const income = session.monthlyIncome?.trim() ?? "";
  if (!session.amount || income === "") {
    redirect("/");
  }

  if (session.leadId) {
    const dest = session.approvedLoanAmount ? "/apply/approval" : "/apply/pending";
    redirect(postSubmitUrl(dest, session.leadId));
  }

  if (session.authMethod === "singpass" && !hasSingpassMyInfoMerged(session)) {
    redirect("/");
  }

  const initialData: LoanFormData = { ...initialLoanFormData, ...session };

  return <ReviewForm initialData={initialData} />;
}
