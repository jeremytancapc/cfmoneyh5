import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAxsToken } from "@/lib/axs-token";
import { AxsBookingView } from "./axs-booking-view";

export const metadata: Metadata = {
  title: "Book Your Appointment — CF Money",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AxsBookPage({ searchParams }: Props) {
  const params = await searchParams;
  const { token } = params;

  if (!token) {
    redirect("/axs");
  }

  const payload = verifyAxsToken(token);

  if (!payload) {
    // Token expired or invalid
    redirect("/axs");
  }

  return (
    <AxsBookingView
      leadId={payload.leadId}
      axsRef={payload.axsRef}
      approvedAmount={payload.approvedAmount}
      tenure={payload.tenure}
      token={token}
    />
  );
}
