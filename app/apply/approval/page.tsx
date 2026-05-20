import { redirect } from "next/navigation";

import { enforceApplyFunnel } from "@/lib/apply-funnel-enforce";
import {
  getApprovalOffer,
  mergeOfferIntoFormData,
} from "@/lib/approval-offer";
import { getApplySession } from "@/lib/apply-session";
import { createAdminClient } from "@/lib/supabase/client";
import { initialLoanFormData, type LoanFormData } from "@/lib/loan-form";

import { ApprovalView } from "./approval-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ leadId?: string | string[] }>;
}

export default async function ApprovalPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await enforceApplyFunnel("/apply/approval", sp);

  const session = await getApplySession();
  const offer = await getApprovalOffer();

  const leadId =
    (typeof session?.leadId === "string" && session.leadId.length > 0
      ? session.leadId
      : null) ??
    offer?.leadId ??
    null;

  if (!leadId) {
    redirect("/");
  }

  const formData: LoanFormData = {
    ...initialLoanFormData,
    ...session,
    ...(offer ? mergeOfferIntoFormData(offer) : {}),
    leadId,
  };

  if (!formData.approvedLoanAmount || formData.approvedLoanAmount <= 0) {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("credit_assessments")
      .select("approved_loan_amount, verified_monthly_income, income_source")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (row) {
      formData.approvedLoanAmount = Number(row.approved_loan_amount) || 0;
      formData.verifiedMonthlyIncome = Number(row.verified_monthly_income) || 0;
      const src = row.income_source;
      if (src === "cpf" || src === "noa" || src === "self_declared") {
        formData.incomeSource = src;
      }
    }
  }

  if (!formData.approvedLoanAmount || formData.approvedLoanAmount <= 0) {
    redirect("/");
  }

  return <ApprovalView formData={formData} />;
}
