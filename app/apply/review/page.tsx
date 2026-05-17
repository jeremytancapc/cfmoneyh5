import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { GATE_COOKIE, getApplySession } from "@/lib/apply-session";
import { initialLoanFormData, type LoanFormData } from "@/lib/loan-form";

import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

/** Post-Singpass (and manual) review — session required; gate set at activate or session save. */
export default async function ReviewPage() {
  const session = await getApplySession();
  const cookieStore = await cookies();
  const hasApplyGate = cookieStore.get(GATE_COOKIE)?.value === "1";

  if (!session || !hasApplyGate) {
    redirect("/");
  }

  const initialData: LoanFormData = { ...initialLoanFormData, ...session };

  return <ReviewForm initialData={initialData} />;
}
