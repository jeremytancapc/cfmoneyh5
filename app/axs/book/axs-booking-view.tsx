"use client";

import { useRouter } from "next/navigation";
import { AppointmentBooking, type BookingConfirmation } from "@/app/appointment-booking";
import type { LoanFormData } from "@/lib/loan-form";

interface Props {
  leadId: string;
  axsRef: string;
  approvedAmount: number;
  tenure: number;
  token: string;
}

const LOG = "[axs/book:client]";

export function AxsBookingView({ leadId, axsRef, approvedAmount, tenure, token }: Props) {
  const router = useRouter();

  // Minimal formData for AppointmentBooking (only uses idType for "Things to Bring")
  const formData = {
    idType: "singaporean",
    amount: approvedAmount,
  } as unknown as LoanFormData;

  async function handleConfirm(date: string, time: string): Promise<BookingConfirmation | null> {
    console.info(`${LOG} POST /api/axs/book`, { date, time, leadId, axsRef });

    const res = await fetch("/api/axs/book", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, time, token }),
    });

    console.info(`${LOG} response`, { status: res.status, ok: res.ok });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      console.error(`${LOG} book failed`, { status: res.status, error: body.error });
      alert("We couldn't confirm your appointment. Please try again.");
      return null;
    }

    const json = (await res.json()) as BookingConfirmation;
    console.info(`${LOG} success — redirecting to /axs/booked`, {
      appointmentId: json.appointmentId,
      cfh5Id: json.cfh5Id,
      date: json.date,
      time: json.time,
    });

    const params = new URLSearchParams({ date: json.date, time: json.time, ref: json.cfh5Id });
    router.replace(`/axs/booked?${params.toString()}`);
    return json;
  }

  return (
    <AppointmentBooking
      formData={formData}
      onBack={() => {}}
      onConfirm={handleConfirm}
      onBookedRedirect
    />
  );
}
