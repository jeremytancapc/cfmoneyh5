import { cookies } from "next/headers";

import { DRAFT_LEAD_COOKIE } from "@/lib/apply-session-codec";
import { createAdminClient } from "@/lib/supabase/client";
import type { LoanFormData } from "@/lib/loan-form";
import { looksLikeLeadUuid } from "@/lib/lead-id";
import {
  loadMyinfoProcessedPayload,
  processedPayloadFromAuthStore,
} from "@/lib/myinfo-profile";

/**
 * Merge CPF/NOA into session for /apply/review when the cookie was slimmed at activate.
 */
export async function hydrateSingpassReviewSession(
  session: Partial<LoanFormData> | null,
): Promise<Partial<LoanFormData> | null> {
  if (!session || session.authMethod !== "singpass") return session;

  const hasBulk =
    (session.cpfContributions?.length ?? 0) > 0 ||
    (session.noaHistory?.length ?? 0) > 0;
  if (hasBulk) return session;

  const store = await cookies();
  const draftLeadId = store.get(DRAFT_LEAD_COOKIE)?.value?.trim() ?? "";

  let processed = null;

  if (looksLikeLeadUuid(draftLeadId)) {
    try {
      const admin = createAdminClient();
      processed = await loadMyinfoProcessedPayload(admin, draftLeadId);
    } catch (err) {
      console.error("[hydrate] myinfo_profiles load failed:", err);
    }
  }

  if (!processed && session.singpassRawKey) {
    processed = processedPayloadFromAuthStore(session.singpassRawKey);
  }

  if (!processed) return session;

  return {
    ...session,
    cpfContributions: processed.cpfContributions,
    noaHistory: processed.noaHistory,
    dob: session.dob || processed.dob,
  };
}
