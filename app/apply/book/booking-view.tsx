"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppointmentBooking } from "@/app/appointment-booking";
import type { LoanFormData } from "@/lib/loan-form";

interface Props {
  formData: LoanFormData;
}

export function BookingView({ formData }: Props) {
  const router = useRouter();

  async function handleConfirm() {
    // Clear all apply/review cookies once the appointment is confirmed.
    await fetch("/api/apply/session", { method: "DELETE" });
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10">
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
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <div className="flex items-center px-6 pb-4 pt-8 lg:hidden">
          <a href="/">
            <Image src="/images/cf-money-full-color.png" alt="CF Money" width={120} height={36} className="h-4 w-auto" priority />
          </a>
        </div>

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <AppointmentBooking
              formData={formData}
              onBack={() => router.push("/apply/review")}
              onConfirm={handleConfirm}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
