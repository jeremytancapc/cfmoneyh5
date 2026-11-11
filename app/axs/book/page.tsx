import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAxsToken } from "@/lib/axs-token";
import { createAdminClient } from "@/lib/supabase/client";
import { axsApplicationRef } from "@/lib/lead-id";
import { BOOKING_LOCK_STATUSES } from "@/lib/axs-status-sync";
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

  // One booking per application. The link never expires and is replayable,
  // so without this a returning customer is shown a fresh picker and can book
  // a second slot. Send them to their existing confirmation instead — changes
  // go through us, there is no self-serve reschedule. Once AirConnect reports
  // the appointment cancelled or missed, the picker shows again so they can
  // rebook from the same link.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("appointments")
    .select("appointment_date, appointment_time")
    .eq("lead_id", payload.leadId)
    .in("status", BOOKING_LOCK_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.appointment_date) {
    const params = new URLSearchParams({
      date: String(existing.appointment_date),
      // Stored as time (HH:MM:SS); the confirmation page expects HH:MM.
      time: String(existing.appointment_time ?? "").slice(0, 5),
      ref: axsApplicationRef(payload.leadId),
    });
    redirect(`/axs/booked?${params.toString()}`);
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
