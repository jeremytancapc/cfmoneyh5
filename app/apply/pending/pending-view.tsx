"use client";

import Image from "next/image";
import {
  HourglassMedium,
  Phone,
  WhatsappLogo,
  EnvelopeSimple,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";
import type { LoanFormData } from "@/lib/loan-form";

interface Props {
  formData: LoanFormData;
}

/** Shorten a UUID to the last 8 characters for display as a reference number. */
function shortRef(leadId: string): string {
  return leadId.slice(-8).toUpperCase();
}

const NEXT_STEPS = [
  "Our team will review your application within 1–2 business days.",
  "We may contact you to request supporting documents.",
  "You can call or WhatsApp us to check on your application status.",
];

export function PendingView({ formData }: Props) {
  const { fullName, leadId, amount, idType } = formData;
  const firstName = fullName ? fullName.split(" ")[0] : null;
  const ref = leadId ? shortRef(leadId) : null;

  const isForeigner = idType === "foreigner";

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      {/* Sidebar */}
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
            Application received
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            We've received your application and our team will be in touch with you shortly.
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col flex-1 overflow-x-clip">
        <div className="flex items-center px-6 pb-4 pt-8 lg:hidden">
          <a href="/">
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

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px] flex flex-col gap-8 animate-fade-up">

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <HourglassMedium
                size={18}
                weight="duotone"
                className="text-[var(--text-tertiary)] shrink-0"
                style={{ color: "#e07b4a" }}
              />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                Application Pending Review
              </span>
            </div>

            {/* Heading */}
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {firstName ? `Thank you, ${firstName}.` : "Thank you for applying."}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Your application for a loan of{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  S${amount.toLocaleString()}
                </span>{" "}
                has been received and is pending review by our team.
              </p>
            </div>

            {/* Reference number */}
            {ref && (
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-4">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Reference number</p>
                  <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-[var(--text-primary)]">
                    {ref}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <HourglassMedium size={18} weight="duotone" style={{ color: "#e07b4a" }} />
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">What happens next</p>
              <ul className="flex flex-col gap-2.5">
                {NEXT_STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle
                      size={15}
                      weight="duotone"
                      className="mt-0.5 shrink-0"
                      style={{ color: "#e07b4a" }}
                    />
                    <span className="text-sm leading-snug text-[var(--text-secondary)]">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Foreigner income note */}
            {isForeigner && (
              <div className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3">
                <Info size={15} weight="duotone" className="mt-0.5 shrink-0 text-[var(--text-tertiary)]" />
                <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
                  For foreigners, a minimum annual income of S$40,000 is required. If your income has changed recently, please contact us with your latest payslips.
                </p>
              </div>
            )}

            <div className="h-px bg-[var(--border-subtle)]" />

            {/* Contact options */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Get in touch</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <a
                  href="tel:+6567778080"
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 transition-all duration-200 hover:border-[var(--border-medium)] active:scale-[0.98]"
                >
                  <Phone size={15} weight="duotone" className="shrink-0 text-brand-blue" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Call us</p>
                    <p className="text-xs text-[var(--text-tertiary)]">6777 8080</p>
                  </div>
                </a>

                <a
                  href="https://wa.me/6560119380?text=Hi%2C%20I%20would%20like%20to%20follow%20up%20on%20my%20loan%20application"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 transition-all duration-200 hover:border-[var(--border-medium)] active:scale-[0.98]"
                >
                  <WhatsappLogo size={15} weight="duotone" className="shrink-0 text-brand-blue" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">WhatsApp</p>
                    <p className="text-xs text-[var(--text-tertiary)]">6011 9380</p>
                  </div>
                </a>

                <a
                  href="mailto:info@cfmoney.sg"
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 transition-all duration-200 hover:border-[var(--border-medium)] active:scale-[0.98]"
                >
                  <EnvelopeSimple size={15} weight="duotone" className="shrink-0 text-brand-blue" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Email</p>
                    <p className="text-xs text-[var(--text-tertiary)]">info@cfmoney.sg</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
              Office hours: Mon – Sat, 10:30am – 7:30pm. Closed on Sundays and Public Holidays.
            </p>

          </div>
        </div>
      </main>
    </div>
  );
}
