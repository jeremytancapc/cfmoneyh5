import type { Metadata } from "next";
import { AxsBookingView } from "./axs-booking-view";

export const metadata: Metadata = {
  title: "Book Your Appointment — CF Money",
};

export default function AxsBookPage() {
  return <AxsBookingView />;
}
