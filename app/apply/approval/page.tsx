import { redirect } from "next/navigation";

import { getApplySession } from "@/lib/apply-session";
import { createAdminClient } from "@/lib/supabase/client";
import { initialLoanFormData, type LoanFormData } from "@/lib/loan-form";
import { looksLikeLeadUuid } from "@/lib/lead-id";

import { ApprovalView } from "./approval-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ leadId?: string | string[] }>;
}

function pickLeadQuery(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  return undefined;
}

export default async function ApprovalPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const session = await getApplySession();

  if (!session) {
    redirect("/");
  }

  const qRaw = pickLeadQuery(sp.leadId);
  const qLead = qRaw && looksLikeLeadUuid(qRaw) ? qRaw.trim() : undefined;

  const leadFromCookie =
    typeof session.leadId === "string" && session.leadId.length > 0
      ? session.leadId
      : null;

  const leadId = leadFromCookie ?? qLead ?? null;

  if (!leadId) {
    redirect("/");
  }

  const formData: LoanFormData = { ...initialLoanFormData, ...session, leadId };

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
