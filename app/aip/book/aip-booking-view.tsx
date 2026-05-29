"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppointmentBooking, type BookingConfirmation } from "@/app/appointment-booking";
import { MobileHeader } from "@/app/mobile-header";
import { trackEvent } from "@/lib/analytics";
import type { LoanFormData } from "@/lib/loan-form";

const LOG = "[aip/book:client]";

// AIP flow only needs idType for the "Things to Bring" list; default to sg_pr.
const AIP_FORM_DATA = { idType: "singaporean" } as unknown as LoanFormData;

export function AipBookingView() {
  const router = useRouter();

  async function handleConfirm(date: string, time: string): Promise<BookingConfirmation | null> {
    console.info(`${LOG} POST /api/aip/book`, { date, time });

    const res = await fetch("/api/aip/book", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, time }),
    });

    console.info(`${LOG} response`, { status: res.status, ok: res.ok });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      console.error(`${LOG} book failed`, { status: res.status, error: body.error });
      alert("We couldn't confirm your appointment. Please try again.");
      return null;
    }

    const json = (await res.json()) as BookingConfirmation;
    console.info(`${LOG} success — redirecting to /aip/booked`, {
      appointmentId: json.appointmentId,
      cfh5Id: json.cfh5Id,
      date: json.date,
      time: json.time,
    });
    trackEvent("aip_step2_appointment_booked", { date: json.date, time: json.time });
    router.replace("/aip/booked");
    return json;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10">
          <div className="mb-16">
            <Image
              src="/images/cf-money-white.png"
              alt="CF Money"
              width={160}
              height={48}
              className="h-6 w-auto"
              priority
            />
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-[var(--text-on-brand)] max-w-[420px]">
            Book your appointment
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            Choose a date and time that works best for you to visit our office.
          </p>
        </div>
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <MobileHeader />

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <AppointmentBooking
              formData={AIP_FORM_DATA}
              onBack={() => router.push("/aip")}
              onConfirm={handleConfirm}
              onBookedRedirect
            />
          </div>
        </div>
      </main>
    </div>
  );
}
