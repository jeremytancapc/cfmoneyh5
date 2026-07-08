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
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-brand-blue">
        <Image
          src="/images/cf-money-white.png"
          alt="CF Money"
          width={120}
          height={36}
          className="h-5 w-auto"
          priority
        />
        <span className="hidden sm:inline-block text-xs font-medium text-[var(--text-on-brand)] opacity-75 tracking-wide uppercase">
          Loan Application
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
