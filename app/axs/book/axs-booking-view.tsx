"use client";

import { useRouter } from "next/navigation";
import { AppointmentBooking } from "@/app/appointment-booking";
import type { LoanFormData } from "@/lib/loan-form";

// Only idType and amount are used by AppointmentBooking internals.
const AXS_FORM_DATA = {
  idType: "singaporean",
  amount: 5000,
} as unknown as LoanFormData;

function generateRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function AxsBookingView() {
  const router = useRouter();

  async function handleConfirm(date: string, time: string) {
    const ref = generateRef();
    const params = new URLSearchParams({ date, time, ref });
    router.push(`/axs/booked?${params.toString()}`);
    return null;
  }

  return (
    <AppointmentBooking
      formData={AXS_FORM_DATA}
      onBack={() => router.push("/axs/offer")}
      onConfirm={handleConfirm}
      onBookedRedirect
    />
  );
}
