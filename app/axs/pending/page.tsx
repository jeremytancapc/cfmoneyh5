import type { Metadata } from "next";

import { axsApplicationRef, looksLikeLeadUuid } from "@/lib/lead-id";
import { createAdminClient } from "@/lib/supabase/client";

import { PendingView } from "./pending-view";

export const metadata: Metadata = {
  title: "Application Received — CF Money",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ leadId?: string | string[] }>;
}

/**
 * Where AXS send a customer we review before booking: any foreigner, and an
 * SG/PR with no CPF or NOA in MyInfo (see partnerPage). The bookingUrl from
 * /api/axs/submit points here instead of the booking link.
 *
 * Keyed by the lead uuid, never the booking token: the token would let the
 * customer swap the path to /axs/book and book anyway. A missing, unknown or
 * non-AXS lead still gets the page, just without a name or reference, so a
 * link AXS hold never breaks.
 */
export default async function AxsPendingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.leadId) ? sp.leadId[0] : sp.leadId;
  const leadId = raw && looksLikeLeadUuid(raw) ? raw.trim() : null;

  let firstName: string | null = null;
  let applicationRef: string | null = null;

  if (leadId) {
    const { data: lead } = await createAdminClient()
      .from("leads")
      .select("full_name, auth_method")
      .eq("id", leadId)
      .maybeSingle();

    if (lead?.auth_method === "axs") {
      firstName = ((lead.full_name as string | null) ?? "").split(" ")[0] || null;
      applicationRef = axsApplicationRef(leadId);
    }
  }

  return <PendingView firstName={firstName} applicationRef={applicationRef} />;
}
