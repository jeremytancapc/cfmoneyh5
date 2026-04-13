import Image from "next/image";
import { LoanApplicationForm } from "./loan-application-form";
import { SidebarTrustFeatures } from "./sidebar-trust-features";

export default function HomePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
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
            Get the funds you need, in 8 minutes
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            One simple application. Licensed, regulated, and trusted by over
            200,000 Singaporeans since 2011.
          </p>
        </div>

        <SidebarTrustFeatures />

        <div
          className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-teal-hex) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -top-16 -left-16 h-[280px] w-[280px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-teal-hex) 0%, transparent 70%)",
          }}
        />
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Image
            src="/images/cf-money-full-color.png"
            alt="CF Money"
            width={120}
            height={36}
            className="h-4 w-auto"
            priority
          />
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            Licensed Money Lender
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-start px-5 pb-8 pt-2 sm:px-8 lg:justify-center lg:px-12 xl:px-20">
          <div className="w-full max-w-[520px]">
            <LoanApplicationForm />
          </div>
        </div>
      </main>
    </div>
  );
}
