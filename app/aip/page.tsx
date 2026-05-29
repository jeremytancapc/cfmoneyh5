import { redirect } from "next/navigation";
import Image from "next/image";
import { getAipBookingConfirmation } from "@/lib/aip-session";
import { MobileHeader } from "@/app/mobile-header";
import { AipMobileForm } from "./aip-mobile-form";

export const dynamic = "force-dynamic";

export default async function AipPage() {
  // If they already booked, send straight to confirmation.
  const existing = await getAipBookingConfirmation();
  if (existing) redirect("/aip/booked");

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
            Good news — you&apos;ve been pre-approved.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            Book your appointment at our office to finalise your loan offer in person.
          </p>
        </div>

        <div className="relative z-10 mt-12">
          <div className="flex flex-col gap-3">
            {[
              "No credit check required at this step",
              "No documents needed — just bring your NRIC",
              "Disbursed same day upon approval",
            ].map((point) => (
              <div key={point} className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white opacity-60" />
                <p className="text-sm text-[var(--text-on-brand)] opacity-75">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <MobileHeader />

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <AipMobileForm />
          </div>
        </div>
      </main>
    </div>
  );
}
