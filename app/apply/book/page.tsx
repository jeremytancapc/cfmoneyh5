import { redirect } from "next/navigation";
import { getApplySession } from "@/lib/apply-session";
import { getApprovalOffer, mergeOfferIntoFormData } from "@/lib/approval-offer";
import { enforceApplyFunnel } from "@/lib/apply-funnel-enforce";
import { initialLoanFormData } from "@/lib/loan-form";
import { BookingView } from "./booking-view";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  await enforceApplyFunnel("/apply/book");

  const session = await getApplySession();
  const offer = await getApprovalOffer();

  if (!session && !offer) redirect("/");

  const formData = {
    ...initialLoanFormData,
    ...session,
    ...(offer ? mergeOfferIntoFormData(offer) : {}),
  };

  if (!formData.leadId) redirect("/");

  return <BookingView formData={formData} />;
}
