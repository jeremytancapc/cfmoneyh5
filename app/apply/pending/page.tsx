import { redirect } from "next/navigation";
import { getApplySession } from "@/lib/apply-session";
import { initialLoanFormData } from "@/lib/loan-form";
import { looksLikeLeadUuid } from "@/lib/lead-id";
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

export default async function PendingPage({ searchParams }: PageProps) {
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

  /** Prefer cookie; fallback to ?leadId= from submit redirect when cookie is missing/truncated (common with large Singpass sessions). */
  const leadId = leadFromCookie ?? qLead ?? null;

  if (!leadId) {
    redirect("/");
  }

  const formData = { ...initialLoanFormData, ...session, leadId };

  return <PendingView formData={formData} />;
}
