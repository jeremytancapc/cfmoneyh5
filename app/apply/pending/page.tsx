import { redirect } from "next/navigation";
import { getApplySession } from "@/lib/apply-session";
import { initialLoanFormData } from "@/lib/loan-form";
import { PendingView } from "./pending-view";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const session = await getApplySession();

  // Must have a leadId — means submit was called
  if (!session || !session.leadId) redirect("/");

  const formData = { ...initialLoanFormData, ...session };

  return <PendingView formData={formData} />;
}
