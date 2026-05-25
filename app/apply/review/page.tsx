import { initialLoanFormData, type LoanFormData } from "@/lib/loan-form";
import { getApplySession } from "@/lib/apply-session";
import { enforceApplyFunnel } from "@/lib/apply-funnel-enforce";
import { hydrateSingpassReviewSession } from "@/lib/singpass-session-hydrate";

import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

/**
 * Unified continuation after step 3 (manual or Singpass).
 * Steps 4–9 only run here — not on `/`.
 */
export default async function ReviewPage() {
  await enforceApplyFunnel("/apply/review");

  const session = await getApplySession();
  const hydrated = await hydrateSingpassReviewSession(session);
  const initialData: LoanFormData = {
    ...initialLoanFormData,
    ...hydrated,
  };

  return <ReviewForm initialData={initialData} />;
}
