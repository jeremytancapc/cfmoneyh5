import { redirect } from "next/navigation";
import { getApplySession } from "@/lib/apply-session";
import { initialLoanFormData } from "@/lib/loan-form";
import { ApprovalView } from "./approval-view";

export const dynamic = "force-dynamic";

export default async function ApprovalPage() {
  const session = await getApplySession();

  if (!session || !session.leadId) redirect("/apply");

  const formData = { ...initialLoanFormData, ...session };

  return <ApprovalView formData={formData} />;
}
