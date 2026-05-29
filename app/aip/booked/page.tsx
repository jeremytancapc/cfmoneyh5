import { redirect } from "next/navigation";
import Image from "next/image";
import { getAipBookingConfirmation } from "@/lib/aip-session";
import { MobileHeader } from "@/app/mobile-header";
import { AipBookedView } from "./aip-booked-view";

export const dynamic = "force-dynamic";

export default async function AipBookedPage() {
  const booking = await getAipBookingConfirmation();
  if (!booking) redirect("/aip");

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
            You&apos;re all set
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            Your appointment reference and visit time are below.
          </p>
        </div>
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <MobileHeader />

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <AipBookedView booking={booking} />
          </div>
        </div>
      </main>
    </div>
  );
}
