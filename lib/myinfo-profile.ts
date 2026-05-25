import type { SupabaseClient } from "@supabase/supabase-js";

import { peekAuthCallbackPayload } from "@/lib/auth-callback-store";
import { buildMyInfoPatch } from "@/lib/myinfo";
import type { CpfContribution, LoanFormData, NoaRecord } from "@/lib/loan-form";

export type MyinfoProcessedPayload = {
  cpfContributions: CpfContribution[];
  noaHistory: NoaRecord[];
  dob: string;
};

type RawCallbackPayload = {
  myinfo?: Record<string, unknown>;
};

function noaMonthlyFromHistory(noaHistory: NoaRecord[]): number | null {
  if (noaHistory.length === 0) return null;
  return noaHistory[0].employmentIncome / 12;
}

function rawFromStore(singpassRawKey: string | undefined) {
  if (!singpassRawKey) {
    return { myinfoRaw: null as Record<string, unknown> | null, cpfRaw: null, noaRaw: null };
  }
  const payload = peekAuthCallbackPayload(singpassRawKey) as RawCallbackPayload | null;
  const myinfoRaw = payload?.myinfo ?? null;
  return {
    myinfoRaw,
    cpfRaw: (myinfoRaw?.cpfcontributions as Record<string, unknown>) ?? null,
    noaRaw: (myinfoRaw?.noahistory as Record<string, unknown>) ?? null,
  };
}

/** Persist MyInfo at activate so the session cookie can stay slim. */
export async function upsertMyinfoProfileForLead(
  admin: SupabaseClient,
  leadId: string,
  form: Partial<LoanFormData>,
): Promise<void> {
  const cpfContributions = form.cpfContributions ?? [];
  const noaHistory = form.noaHistory ?? [];
  const { myinfoRaw, cpfRaw, noaRaw } = rawFromStore(form.singpassRawKey);

  const { error } = await admin.from("myinfo_profiles").upsert(
    {
      lead_id: leadId,
      nric: form.nric || null,
      full_name: form.fullName || null,
      email: form.email || null,
      mobile: form.mobile || null,
      address: form.address || null,
      postal_code: form.postalCode || null,
      residential_status: form.idType || null,
      monthly_income_noa: noaMonthlyFromHistory(noaHistory),
      cpf_raw: cpfRaw,
      noa_raw: noaRaw,
      myinfo_raw: myinfoRaw,
      raw_payload: {
        cpfContributions,
        noaHistory,
        dob: form.dob ?? "",
      },
    },
    { onConflict: "lead_id" },
  );

  if (error) {
    throw error;
  }
}

export async function loadMyinfoProcessedPayload(
  admin: SupabaseClient,
  leadId: string,
): Promise<MyinfoProcessedPayload | null> {
  const { data, error } = await admin
    .from("myinfo_profiles")
    .select("raw_payload")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error || !data?.raw_payload) return null;

  const raw = data.raw_payload as {
    cpfContributions?: CpfContribution[];
    noaHistory?: NoaRecord[];
    dob?: string;
  };

  return {
    cpfContributions: raw.cpfContributions ?? [],
    noaHistory: raw.noaHistory ?? [],
    dob: raw.dob ?? "",
  };
}

/** Rebuild processed CPF/NOA from auth-callback-store when DB row is missing. */
export function processedPayloadFromAuthStore(
  singpassRawKey: string,
): MyinfoProcessedPayload | null {
  const payload = peekAuthCallbackPayload(singpassRawKey) as RawCallbackPayload | null;
  if (!payload?.myinfo) return null;
  const patch = buildMyInfoPatch(payload.myinfo);
  return {
    cpfContributions: patch.cpfContributions ?? [],
    noaHistory: patch.noaHistory ?? [],
    dob: patch.dob ?? "",
  };
}
