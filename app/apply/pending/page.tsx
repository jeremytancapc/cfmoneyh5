import { redirect } from "next/navigation";

import { enforceApplyFunnel } from "@/lib/apply-funnel-enforce";
import { createAdminClient } from "@/lib/supabase/client";
import { looksLikeLeadUuid } from "@/lib/lead-id";
import type { PendingDisplay } from "@/lib/pending-display";

import { PendingView } from "./pending-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ leadId?: string | string[] }>;
}

function pickLeadQuery(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  return undefined;
}

/**
 * Pending confirmation (like /apply/booked): survives reload via ?leadId= only.
 * Apply cookies are cleared in middleware + submit response (not here — RSC cannot mutate cookies).
 */
export default async function PendingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await enforceApplyFunnel("/apply/pending", sp);

  const qRaw = pickLeadQuery(sp.leadId);
  const leadId = qRaw && looksLikeLeadUuid(qRaw) ? qRaw.trim() : null;

  if (!leadId) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from("leads")
    .select("full_name, loan_amount, id_type")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !lead) {
    redirect("/");
  }

  const pending: PendingDisplay = {
    leadId,
    fullName: (lead.full_name as string) ?? "",
    amount: Number(lead.loan_amount) || 0,
    idType: (lead.id_type as string) ?? "",
  };

  return <PendingView pending={pending} />;
}
