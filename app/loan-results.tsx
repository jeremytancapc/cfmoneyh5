"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Scroll,
  HandCoins,
  ArrowRight,
  Warning,
  Clock,
  ArrowLeft,
  X,
  TrendUp,
} from "@phosphor-icons/react";
import { ContainerTextFlip } from "@/components/ui/modern-animated-multi-words";

interface FormData {
  amount: number;
  tenure: number;
  urgency: string;
  authMethod: "" | "singpass" | "manual";
  idType: string;
  fullName: string;
  nric: string;
  employmentStatus: string;
  monthlyIncome: string;
  mobile: string;
  loanPurpose: string;
  postalCode: string;
  address: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const NOTICE_ITEMS = [
  {
    icon: ShieldCheck,
    short: "In-person visit required for AML/KYC.",
    text: "A face-to-face visit is required by local regulations for AML and KYC purposes.",
  },
  {
    icon: Scroll,
    short: "Loan officer explains all terms in person.",
    text: "Our loan officer will explain all terms, conditions, and interest rates in person.",
  },
  {
    icon: HandCoins,
    short: "Takes 20 mins: Verify, sign & receive funds.",
    text: "The entire process takes approximately 20 minutes — verification, signing, and disbursement on the spot.",
  },
];

const DETERRENT_ITEMS = [
  {
    icon: Clock,
    heading: "Offer expires in 3 days",
    body: "This in-principle approval is time-limited. After 3 days it lapses and you will need to submit a full application again.",
  },
  {
    icon: TrendUp,
    heading: "Rates may change on reapplication",
    body: "Interest rates are assessed at the time of application. A future application is not guaranteed the same rate.",
  },
  {
    icon: Warning,
    heading: "Your credit check is already done",
    body: "We have already performed a soft credit assessment for this offer. Reapplying later triggers a fresh check.",
  },
] as const;

interface LoanResultsProps {
  formData: FormData;
  monthlyRepayment: number;
  onAccept: () => void;
}

/* ── Reconsider Modal ─────────────────────────────────────────────── */
function ReconsiderModal({
  onAccept,
  onClose,
}: {
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4"
      style={{
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "oklch(0.18 0.02 260 / 0.55)",
        animation: "fade-up 0.25s cubic-bezier(0.16,1,0.3,1) both",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] px-6 pb-8 pt-6 flex flex-col gap-6"
        style={{ background: "var(--surface-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--surface-secondary)] active:scale-[0.95]"
          aria-label="Close"
        >
          <X size={16} weight="bold" className="text-[var(--text-tertiary)]" />
        </button>

        <div className="flex flex-col gap-2 pr-8">
          <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Are you sure?
          </p>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Your application is approved in principle. Here is what you stand to
            lose by waiting.
          </p>
        </div>

        <ul className="flex flex-col gap-5">
          {DETERRENT_ITEMS.map(({ icon: Icon, heading, body }, i) => (
            <li
              key={i}
              className="flex items-start gap-4"
              style={{
                opacity: 0,
                animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
              }}
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ background: "oklch(0.78 0.16 178 / 0.10)" }}
              >
                <Icon size={15} weight="duotone" className="text-brand-teal" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {heading}
                </p>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="h-px bg-[var(--border-subtle)]" />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onAccept}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            <ArrowLeft size={16} weight="bold" />
            Accept the offer now
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-center text-xs text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-secondary)]"
          >
            I understand, I still need more time
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
export function LoanResults({
  formData,
  monthlyRepayment,
  onAccept,
}: LoanResultsProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="animate-fade-up flex flex-col gap-8">

        {/* ── "Approved in principal" animated hero ────────────────── */}
        <div
          style={{
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0ms both",
          }}
        >
          <ContainerTextFlip
            words={["Approved in principal"]}
            variant="primary"
            className="font-display"
          />
        </div>

        {/* ── Loan offer details ──────────────────────────────────── */}
        <div
          className="mt-4 flex flex-col items-center gap-1 text-center"
          style={{
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 60ms both",
          }}
        >
          <p className="font-display text-5xl sm:text-6xl font-black tracking-tighter text-brand-blue tabular-nums">
            {formatCurrency(formData.amount)}<sup className="text-2xl sm:text-3xl align-super">*</sup>
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
            <span className="text-base sm:text-lg font-semibold text-[var(--text-secondary)]">
              {formData.tenure} months
            </span>
            <span className="text-base sm:text-lg font-semibold text-[var(--text-secondary)]">
              {formatCurrency(monthlyRepayment)}/mo est.
            </span>
          </div>
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 mt-3"
            style={{
              background: "oklch(0.72 0.18 50 / 0.15)",
              border: "1px solid oklch(0.72 0.18 50 / 0.40)",
            }}
          >
            <Clock
              size={13}
              weight="duotone"
              style={{
                color: "oklch(0.55 0.20 50)",
                flexShrink: 0,
                animation: "clock-tick 3s steps(12, end) infinite",
              }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "oklch(0.45 0.20 50)" }}
            >
              Offer valid for 3 days only
            </span>
          </div>
        </div>

        {/* ── To receive your funds ───────────────────────────────── */}
        <div
          className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-4"
          style={{
            background: "oklch(0.32 0.14 260 / 0.03)",
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 200ms both",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            To receive your funds
          </p>
          <ul className="flex flex-col gap-3 sm:gap-4">
            {NOTICE_ITEMS.map(({ icon: Icon, short, text }, i) => (
              <li
                key={i}
                className="flex items-start gap-3"
                style={{
                  opacity: 0,
                  animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${280 + i * 70}ms both`,
                }}
              >
                <Icon
                  size={16}
                  weight="duotone"
                  className="mt-0.5 shrink-0 text-brand-blue"
                />
                <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p
            className="text-[10px] sm:text-xs leading-relaxed text-[var(--text-tertiary)]"
            style={{
              opacity: 0,
              animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 490ms both",
            }}
          >
            * The pre-approved amount shown is indicative and may vary if there are changes to your profile between now and your appointment.
          </p>
        </div>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-3"
          style={{
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 480ms both",
          }}
        >
          <button
            type="button"
            onClick={onAccept}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            Accept &amp; Book Appointment
            <ArrowRight size={16} weight="bold" />
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-center text-sm text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-secondary)]"
          >
            I need to think about it
          </button>
        </div>
      </div>

      {/* ── Reconsider modal ───────────────────────────────────── */}
      {showModal && (
        <ReconsiderModal
          onAccept={onAccept}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
