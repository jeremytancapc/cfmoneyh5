"use client";

import { useEffect } from "react";
import { BookingConfirmedView } from "@/app/booking-confirmed-view";
import { trackEvent } from "@/lib/analytics";
import type { AipBookingConfirmation } from "@/lib/aip-session";

interface Props {
  booking: AipBookingConfirmation;
}

export function AipBookedView({ booking }: Props) {
  useEffect(() => {
    trackEvent("aip_step3_confirmation_viewed", { cfh5Id: booking.cfh5Id });
  }, [booking.cfh5Id]);

  return (
    <BookingConfirmedView
      booking={{
        appointmentId: booking.appointmentId,
        cfh5Id: booking.cfh5Id,
        date: booking.date,
        time: booking.time,
        loanAmount: 0,
        idType: "singaporean",
      }}
    />
  );
}
