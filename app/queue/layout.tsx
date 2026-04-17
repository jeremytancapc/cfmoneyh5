import Image from "next/image";
import { SidebarTrustFeatures } from "../sidebar-trust-features";

export const metadata = {
  title: "Queue Status",
};

export default function QueueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <div className="flex items-center px-6 pb-4 pt-8 lg:hidden">
          <a href="https://crawfort.com/sg/" target="_blank" rel="noopener noreferrer">
            <Image
              src="/images/cf-money-full-color.png"
              alt="CF Money"
              width={120}
              height={36}
              className="h-4 w-auto"
              priority
            />
          </a>
        </div>

        <div className="flex flex-1 flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 sm:pt-6 sm:pb-8 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            {children}
          </div>
        </div>

        <footer className="lg:hidden bg-brand-blue px-5 pb-10 pt-12 text-[var(--text-on-brand)]">
          <Image
            src="/images/cf-money-white.png"
            alt="CF Money"
            width={160}
            height={48}
            className="mb-4 h-5 w-auto"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium">
            <span className="opacity-75">Copyright © 2026 CF Money Pte. Ltd. All rights reserved</span>
          </div>

          <p className="mt-4 text-xs leading-relaxed opacity-70">
            CF Money Pte. Ltd. (UEN No. 201406595W) is a company incorporated
            under the laws of Singapore. Customers are advised to read the{" "}
            <a
              href="https://crawfort.com/sg/terms/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 opacity-100"
            >
              Terms and Conditions
            </a>{" "}
            and{" "}
            <a
              href="https://crawfort.com/sg/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 opacity-100"
            >
              Privacy Policy
            </a>{" "}
            carefully.
          </p>

          <p className="mt-4 text-xs font-semibold">
            For loan enquiries, please contact us at{" "}
            <a href="tel:+6567778080" className="underline underline-offset-2">
              +65 6777 8080
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
