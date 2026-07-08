import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Complete Your Application",
  description: "A few final steps to confirm your loan offer with CF Money.",
  robots: { index: false, follow: false },
};

export default function AxsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="axs-theme min-h-[100dvh] flex flex-col bg-[var(--surface-primary)]">
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-brand-blue"
      >
        <Link href="/" aria-label="CF Money home">
          <Image
            src="/images/cf-money-white.png"
            alt="CF Money"
            width={120}
            height={36}
            className="h-5 w-auto"
            priority
          />
        </Link>
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

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] px-6 py-6">
        <div className="mx-auto max-w-[480px] flex flex-col gap-2">
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            CF Money Pte. Ltd. (UEN No. 201406595W) is licensed by the Ministry of Law as a moneylender.
            Licensed Moneylender Licence No. 86/2026.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
            <a
              href="https://crawfort.com/sg/terms/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <a
              href="https://crawfort.com/sg/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors"
            >
              Privacy Policy
            </a>
            <span>© 2026 CF Money Pte. Ltd.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
