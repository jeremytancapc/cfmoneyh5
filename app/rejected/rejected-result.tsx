"use client";

import { XCircle, Phone, EnvelopeSimple, CalendarBlank } from "@phosphor-icons/react";
import { ContainerTextFlip } from "@/components/ui/modern-animated-multi-words";

export function RejectedResult() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero: "Rejected" pill */}
      <div>
        <ContainerTextFlip
          words={["Rejected"]}
          variant="rejected"
          className="font-display"
        />
      </div>

      {/* Icon */}
      <div className="flex justify-center -mt-2">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "oklch(0.65 0.22 20 / 0.10)" }}
        >
          <XCircle
            size={32}
            weight="duotone"
            style={{ color: "oklch(0.50 0.22 20)" }}
          />
        </div>
      </div>

      {/* Rejection message card */}
      <div
        className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-5"
        style={{ background: "oklch(0.65 0.22 20 / 0.04)" }}
      >
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] text-center">
          At this time, your application does not meet our credit criteria. We
          encourage you to try again after{" "}
          <span className="font-semibold text-[var(--text-primary)]">3 months</span>.
        </p>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] text-center">
          If you have any questions or need help, our team is here for you.
        </p>
      </div>

      {/* Reapply badge */}
      <div className="flex justify-center -mt-4">
        <div
          className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5"
          style={{
            background: "oklch(0.65 0.22 20 / 0.08)",
            border: "1px solid oklch(0.65 0.22 20 / 0.25)",
          }}
        >
          <CalendarBlank
            size={13}
            weight="duotone"
            style={{ color: "oklch(0.50 0.22 20)", flexShrink: 0 }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: "oklch(0.40 0.18 20)" }}
          >
            Eligible to reapply after 3 months
          </span>
        </div>
      </div>

      {/* Contact card */}
      <div
        className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-4"
        style={{ background: "oklch(0.32 0.14 260 / 0.03)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          Need help?
        </p>
        <ul className="flex flex-col gap-3 sm:gap-4">
          <li className="flex items-start gap-3">
            <Phone
              size={16}
              weight="duotone"
              className="mt-0.5 shrink-0"
              style={{ color: "oklch(0.50 0.22 20)" }}
            />
            <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Call us at{" "}
              <a
                href="tel:+6567778080"
                className="font-semibold text-[var(--text-primary)] underline underline-offset-2"
              >
                +65 6777 8080
              </a>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <EnvelopeSimple
              size={16}
              weight="duotone"
              className="mt-0.5 shrink-0"
              style={{ color: "oklch(0.50 0.22 20)" }}
            />
            <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Email us at{" "}
              <a
                href="mailto:hellosg@crawfort.com"
                className="font-semibold text-[var(--text-primary)] underline underline-offset-2"
              >
                hellosg@crawfort.com
              </a>
            </span>
          </li>
        </ul>
      </div>

      {/* Back to home CTA */}
      <div className="flex flex-col gap-3">
        <a
          href="/"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
