import { createAdminClient } from "@/lib/supabase/client";
import { getApprovalOffer } from "@/lib/approval-offer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Silent gate. Only the customer holding a valid approval_offer may decline
  // it, and only for the leadId that cookie names. Any mismatch returns 404
  // so an unauthenticated probe cannot even tell this route exists.
  const offer = await getApprovalOffer();
  if (!offer) {
    return new Response(null, { status: 404 });
  }

  try {
    const { leadId, reason } = (await request.json()) as {
      leadId?: string;
      reason?: string;
    };

    if (!leadId || !reason || leadId !== offer.leadId) {
      return new Response(null, { status: 404 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("leads")
      .update({ decline_reason: reason })
      .eq("id", offer.leadId);

    if (error) {
      console.error("[decline-reason] supabase error", error);
      return new Response("DB error", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[decline-reason]", err);
    return new Response(null, { status: 404 });
  }
}
