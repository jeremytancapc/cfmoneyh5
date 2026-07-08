import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookingConfirmedView } from "@/app/booking-confirmed-view";
import { AxsBackButton } from "./axs-back-button";

export const metadata: Metadata = {
  title: "Appointment Confirmed — CF Money",
};

interface Props {
  searchParams: Promise<{ date?: string; time?: string; ref?: string }>;
}

export default async function AxsBookedPage({ searchParams }: Props) {
  const params = await searchParams;
  const { date, time, ref } = params;

  if (!date || !time || !ref) {
    redirect("/axs");
  }

  return (
    <div className="flex flex-col gap-3">
      <BookingConfirmedView
        booking={{
          appointmentId: `axs-${ref}`,
          cfh5Id: ref,
          loanAmount: 5000,
          date,
          time,
          idType: "singaporean",
        }}
      />
      <AxsBackButton />
    </div>
  );
}
