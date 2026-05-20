import { cookies } from "next/headers";

import { decodeSession, encodeSession } from "@/lib/apply-session-codec";
import type { LoanFormData } from "@/lib/loan-form";

/** Persisted after eligible submit — powers /apply/approval and /apply/book for 30 days. */
export const APPROVAL_OFFER_COOKIE = "approval_offer";

/** Same TTL as `booking_confirm`. */
export const APPROVAL_OFFER_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type StoredApprovalOffer = {
  leadId: string;
  approvedLoanAmount: number;
  verifiedMonthlyIncome: number;
  incomeSource: "cpf" | "noa" | "self_declared" | "";
  amount: number;
  fullName?: string;
  idType?: string;
  authMethod?: string;
};

const OFFER_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: APPROVAL_OFFER_MAX_AGE_SEC,
} as const;

export function approvalOfferCookieValue(data: StoredApprovalOffer) {
  return {
    name: APPROVAL_OFFER_COOKIE,
    value: encodeSession(data as unknown as Partial<LoanFormData>),
    ...OFFER_COOKIE_OPTS,
  };
}

export function decodeApprovalOffer(raw: string): StoredApprovalOffer | null {
  const parsed = decodeSession(raw) as Partial<StoredApprovalOffer> | null;
  if (!parsed?.leadId || !parsed.approvedLoanAmount) return null;
  const incomeSource = parsed.incomeSource;
  return {
    leadId: parsed.leadId,
    approvedLoanAmount: Number(parsed.approvedLoanAmount) || 0,
    verifiedMonthlyIncome: Number(parsed.verifiedMonthlyIncome) || 0,
    incomeSource:
      incomeSource === "cpf" || incomeSource === "noa" || incomeSource === "self_declared"
        ? incomeSource
        : "",
    amount: Number(parsed.amount) || 0,
    fullName: parsed.fullName,
    idType: parsed.idType,
    authMethod: parsed.authMethod,
  };
}

export function hasValidApprovalOfferCookie(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const offer = decodeApprovalOffer(raw);
  return Boolean(offer?.leadId && offer.approvedLoanAmount > 0);
}

export async function getApprovalOffer(): Promise<StoredApprovalOffer | null> {
  const store = await cookies();
  const raw = store.get(APPROVAL_OFFER_COOKIE)?.value;
  if (!raw) return null;
  return decodeApprovalOffer(raw);
}

export function storedApprovalOfferFromForm(
  leadId: string,
  formData: Partial<LoanFormData>,
  assessment: {
    approvedLoanAmount: number;
    verifiedMonthlyIncome: number;
    incomeSource: LoanFormData["incomeSource"];
  },
): StoredApprovalOffer {
  return {
    leadId,
    approvedLoanAmount: assessment.approvedLoanAmount,
    verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
    incomeSource: assessment.incomeSource ?? "",
    amount: formData.amount ?? 0,
    fullName: formData.fullName || undefined,
    idType: formData.idType || undefined,
    authMethod: formData.authMethod || undefined,
  };
}

export function clearApprovalOfferCookie() {
  return { name: APPROVAL_OFFER_COOKIE, value: "", maxAge: 0, path: "/" };
}

export async function clearApprovalOfferServer(): Promise<void> {
  const store = await cookies();
  store.delete(APPROVAL_OFFER_COOKIE);
}

export function mergeOfferIntoFormData(
  offer: StoredApprovalOffer,
): Partial<LoanFormData> {
  return {
    leadId: offer.leadId,
    approvedLoanAmount: offer.approvedLoanAmount,
    verifiedMonthlyIncome: offer.verifiedMonthlyIncome,
    incomeSource: offer.incomeSource,
    amount: offer.amount,
    fullName: offer.fullName ?? "",
    idType: offer.idType ?? "",
    authMethod: (offer.authMethod as LoanFormData["authMethod"]) ?? "",
  };
}
