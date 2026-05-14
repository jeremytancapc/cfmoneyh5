"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppointmentBooking } from "@/app/appointment-booking";
import type { LoanFormData } from "@/lib/loan-form";
import { MobileHeader } from "@/app/mobile-header";
import { MapPin, Clock, Train, Car } from "@phosphor-icons/react";

interface Props {
  formData: LoanFormData;
}

export function BookingView({ formData }: Props) {
  const router = useRouter();

  async function handleConfirm(date: string, time: string) {
    const res = await fetch("/api/apply/book", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, time }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (body.error === "slot_taken") {
        // Slot was taken between selection and confirmation — page will reload
        // and the slot will show as fully booked.
        alert("Sorry, that slot was just taken. Please choose another time.");
        return;
      }
      console.error("Failed to book appointment:", body);
    }
    // Cookies are cleared by the /api/apply/book route on success.
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10 flex flex-col gap-10">
          <div>
            <div className="mb-16">
              <Image src="/images/cf-money-white.png" alt="CF Money" width={160} height={48} className="h-6 w-auto" priority />
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-[var(--text-on-brand)] max-w-[420px]">
              Book your appointment
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
              Choose a date and time that works best for you to visit our office.
            </p>
          </div>

          {/* Office info in sidebar */}
          <div className="flex flex-col gap-4">
            <div className="relative h-44 w-full overflow-hidden rounded-[var(--radius-md)]">
              <img
                src="/images/cf-money-shopfront.jpg"
                alt="CF Money office shopfront"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "35% center", transform: "scale(1.35)", transformOrigin: "35% center" }}
              />
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="https://maps.app.goo.gl/Cs9Av94qW3NHh7wY6"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 transition-opacity hover:opacity-80"
              >
                <MapPin size={15} weight="duotone" className="mt-0.5 shrink-0 text-white/70" />
                <div>
                  <p className="text-sm font-medium text-white underline decoration-white/30 underline-offset-2">1 North Bridge Road, High Street Centre</p>
                  <p className="text-sm font-medium text-white underline decoration-white/30 underline-offset-2">#01-35, Singapore 179094</p>
                </div>
              </a>
              <div className="flex items-start gap-3">
                <Clock size={15} weight="duotone" className="mt-0.5 shrink-0 text-white/70" />
                <div>
                  <p className="text-sm text-white/90">Mon – Sat · 10:30am – 7:30pm</p>
                  <p className="text-xs text-white/55">Closed Sundays & Public Holidays</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Train size={15} weight="duotone" className="mt-0.5 shrink-0 text-white/70" />
                <p className="text-sm text-white/90">City Hall MRT (Exit B) or Clarke Quay MRT (Exit E)</p>
              </div>
              <div className="flex items-start gap-3">
                <Car size={15} weight="duotone" className="mt-0.5 shrink-0 text-white/70" />
                <p className="text-sm text-white/90">Multi-storey carpark in the building</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <MobileHeader />

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <AppointmentBooking
              formData={formData}
              onBack={() => router.push("/apply/approval")}
              onConfirm={handleConfirm}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
