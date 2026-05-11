import { redirect } from "next/navigation";
import { getApplySession } from "@/lib/apply-session";
import { initialLoanFormData } from "@/lib/loan-form";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getApplySession();

  // Middleware already guards this route, but belt-and-suspenders.
  if (!session) redirect("/apply");

  const initialData = { ...initialLoanFormData, ...session };

  return <ReviewForm initialData={initialData} />;
}
