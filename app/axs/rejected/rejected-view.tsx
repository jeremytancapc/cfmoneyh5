"use client";

import { Info, WhatsappLogo } from "@phosphor-icons/react";

export function RejectedView() {
  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div className="flex items-center gap-2">
        <Info size={18} weight="duotone" className="shrink-0 text-[var(--text-tertiary)]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
          Application Update
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          We can&apos;t proceed with this application.
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Thank you for applying. We&apos;re unable to offer you a loan through AXS at this time,
          so no appointment can be booked.
        </p>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          If you already have a loan with us, please contact us directly and our team will help you.
        </p>
      </div>

      <div className="h-px bg-[var(--border-subtle)]" />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Get in touch</p>
        <a
          href="https://wa.me/6560119380?text=Hi%20I%20applied%20through%20AXS"
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
