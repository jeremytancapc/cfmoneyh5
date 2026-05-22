/**
 * POST /api/apply/draft
 *
 * Creates a partial lead (status: in_progress) when a manual-flow customer
 * confirms the review page (step 8 → step 5). This captures customers who
 * drop off before reaching the final Submit button.
 *
 * At final submit, the existing lead is updated to status "new" with all data.
 * Returns { leadId } so the client can carry it forward into the submit body.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/client";
import { initialLoanFormData } from "@/lib/loan-form";
import type { LoanFormData } from "@/lib/loan-form";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let bodyData: Partial<LoanFormData> = {};
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      bodyData = (await request.json()) as Partial<LoanFormData>;
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const formData = { ...initialLoanFormData, ...bodyData };

  if (!formData.amount || !formData.tenure) {
    return NextResponse.json({ error: "Missing loan details" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      loan_amount: formData.amount,
      loan_tenure: formData.tenure,
      loan_purpose: formData.loanPurpose || null,
      urgency: formData.urgency || null,
      auth_method: (formData.authMethod || null) as "manual" | "singpass" | null,
      id_type: (formData.idType || null) as "singaporean" | "pr" | "foreigner" | null,
      full_name: formData.fullName || null,
      nric: formData.nric || null,
      monthly_income: formData.monthlyIncome || null,
      status: "in_progress",
      moneylender_no_loans: false,
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("[draft] Failed to create partial lead:", error);
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }

  return NextResponse.json({ leadId: lead.id as string });
}
