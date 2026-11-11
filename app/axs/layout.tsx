import type { Metadata } from "next";
import Image from "next/image";
import { AxsFooter } from "./axs-footer";

export const metadata: Metadata = {
  title: "Complete Your Application",
  description: "A few final steps to confirm your loan offer with CF Money.",
  robots: { index: false, follow: false },
};

export default function AxsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="axs-theme min-h-[100dvh] flex flex-col bg-[var(--surface-primary)]">
      {/* Top nav — logo is non-interactive to keep users in the flow */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-4 bg-brand-blue sm:px-6">
        <Image
          src="/images/crawfort-white-color-dot.png"
          alt="Crawfort"
          width={200}
          height={25}
          className="h-4 w-auto shrink-0 min-[360px]:h-5"
          priority
        />
        {/* Sized to match the logo (AXS asked for it to read as large). Both step
            down together below 360px wide so they still fit on one line. */}
        <span className="whitespace-nowrap text-[15px] font-bold uppercase leading-none tracking-wide text-[var(--text-on-brand)] min-[360px]:text-base min-[400px]:text-lg">
          AXS Ready Cash
        </span>
      </header>

      {/* Page content */}
      <main className="flex flex-1 flex-col items-center px-5 py-10 sm:px-8 sm:py-12">
        <div className="w-full max-w-[480px]">
          {children}
        </div>
      </main>

      <AxsFooter />
    </div>
  );
}
