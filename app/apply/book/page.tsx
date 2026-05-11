import { redirect } from "next/navigation";
import { getApplySession } from "@/lib/apply-session";
import { initialLoanFormData } from "@/lib/loan-form";
import { BookingView } from "./booking-view";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const session = await getApplySession();

  // Middleware already guards this — belt-and-suspenders.
  if (!session) redirect("/apply");

  const formData = { ...initialLoanFormData, ...session };

  return <BookingView formData={formData} />;
}
