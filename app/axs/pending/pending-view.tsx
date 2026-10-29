"use client";

import { CheckCircle, HourglassMedium, WhatsappLogo } from "@phosphor-icons/react";

interface Props {
  firstName: string | null;
  applicationRef: string | null;
}

const NEXT_STEPS = [
  "Our team will review your application and documents within 1–2 business days.",
  "We'll contact you to arrange an appointment, or to ask for anything we still need.",
  "WhatsApp us if you need to follow up.",
];

export function PendingView({ firstName, applicationRef }: Props) {
  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div className="flex items-center gap-2">
        <HourglassMedium size={18} weight="duotone" className="shrink-0" style={{ color: "#e07b4a" }} />
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
          Application Pending Review
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {firstName ? `Thank you, ${firstName}.` : "Thank you for applying."}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          We&apos;ve received your application. Our team needs to review it before an appointment
          can be booked, and will be in touch with you.
        </p>
      </div>

      {applicationRef && (
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Application reference</p>
            <p className="mt-0.5 font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
              {applicationRef}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
            <HourglassMedium size={18} weight="duotone" style={{ color: "#e07b4a" }} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">What happens next</p>
        <ul className="flex flex-col gap-2.5">
          {NEXT_STEPS.map((step) => (
            <li key={step} className="flex items-start gap-3">
              <CheckCircle size={15} weight="duotone" className="mt-0.5 shrink-0" style={{ color: "#e07b4a" }} />
              <span className="text-sm leading-snug text-[var(--text-secondary)]">{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="h-px bg-[var(--border-subtle)]" />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Get in touch</p>
        <a
          href="https://wa.me/6560119380?text=Hi%20My%20AXS%20application%20is%20pending%20review"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 transition-all duration-200 hover:border-[var(--border-medium)] active:scale-[0.98]"
        >
          <WhatsappLogo size={22} weight="duotone" className="shrink-0 text-brand-blue" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">WhatsApp us</p>
            <p className="text-xs text-[var(--text-tertiary)]">6011 9380 · Mon – Sat, 10:30am – 7:30pm</p>
          </div>
        </a>
      </div>

      <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
        Office hours: Mon – Sat, 10:30am – 7:30pm. Closed on Sundays and Public Holidays.
      </p>
    </div>
  );
}
