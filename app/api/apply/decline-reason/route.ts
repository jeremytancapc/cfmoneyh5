import { createAdminClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { leadId, reason } = (await request.json()) as {
      leadId?: string;
      reason?: string;
    };

    if (!leadId || !reason) {
      return new Response("Missing leadId or reason", { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("leads")
      .update({ decline_reason: reason })
      .eq("id", leadId);

    if (error) {
      console.error("[decline-reason] supabase error", error);
      return new Response("DB error", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[decline-reason]", err);
    return new Response("Server error", { status: 500 });
  }
}
