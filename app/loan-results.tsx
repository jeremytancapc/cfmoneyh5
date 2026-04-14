"use client";

import { useState } from "react";
import {
  CheckCircle,
  ShieldCheck,
  Scroll,
  HandCoins,
  ArrowRight,
  Warning,
  Timer,
  ArrowLeft,
  X,
  TrendUp,
} from "@phosphor-icons/react";

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

const LOAN_PURPOSE_LABELS: Record<string, string> = {
  personal: "Personal Expenses",
  medical: "Medical",
  renovation: "Renovation",
  education: "Education",
  business: "Business",
  debt_consolidation: "Debt Consolidation",
  other: "Other",
};

const NOTICE_ITEMS = [
  {
    icon: ShieldCheck,
    text: "A physical visit to our office is required by Singapore law for loan assessment.",
  },
  {
    icon: Scroll,
    text: "Our loan officer will explain all terms, conditions, and interest rates in person.",
  },
  {
    icon: HandCoins,
    text: "Upon approval, loan disbursement is done on the spot — no waiting.",
  },
] as const;

const DETERRENT_ITEMS = [
  {
    icon: Timer,
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

const SUMMARY_ITEMS = (formData: FormData, monthlyRepayment: number) => [
  { label: "Loan Amount", value: formatCurrency(formData.amount) },
  { label: "Tenure", value: `${formData.tenure} months` },
  { label: "Est. Monthly Repayment", value: formatCurrency(monthlyRepayment) },
  ...(formData.loanPurpose
    ? [
        {
          label: "Purpose",
          value: LOAN_PURPOSE_LABELS[formData.loanPurpose] ?? formData.loanPurpose,
        },
      ]
    : []),
];

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
    /* Backdrop */
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
      {/* Dialog panel — stop clicks from reaching backdrop */}
      <div
        className="relative w-full max-w-[480px] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] px-6 pb-8 pt-6 flex flex-col gap-6"
        style={{ background: "var(--surface-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--surface-secondary)] active:scale-[0.95]"
          aria-label="Close"
        >
          <X size={16} weight="bold" className="text-[var(--text-tertiary)]" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2 pr-8">
          <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Are you sure?
          </p>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Your application is approved in principle. Here is what you stand to
            lose by waiting.
          </p>
        </div>

        {/* Deterrent list */}
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

        {/* Divider */}
        <div className="h-px bg-[var(--border-subtle)]" />

        {/* CTAs */}
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
  const summaryItems = SUMMARY_ITEMS(formData, monthlyRepayment);

  return (
    <>
      <div className="animate-fade-up flex flex-col gap-8">
        {/* ── Offer headline ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-2"
            style={{
              opacity: 0,
              animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0ms both",
            }}
          >
            <CheckCircle
              size={18}
              weight="duotone"
              className="shrink-0 text-brand-teal"
            />
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              Your loan offer is ready
            </span>
          </div>

          {/* Amount — the hero, no card wrapper */}
          <div
            style={{
              opacity: 0,
              animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 80ms both",
            }}
          >
            <p className="font-display text-5xl font-bold tracking-tight text-brand-blue tabular-nums sm:text-6xl">
              {formatCurrency(formData.amount)}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Over {formData.tenure} months &middot;{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(monthlyRepayment)}/mo
              </span>{" "}
              est.
            </p>
          </div>
        </div>

        {/* ── Loan summary — divide-y, no card ───────────────────── */}
        <div
          className="divide-y divide-[var(--border-subtle)]"
          style={{
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 160ms both",
          }}
        >
          {summaryItems.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span className="text-[var(--text-tertiary)]">{label}</span>
              <span className="font-medium text-[var(--text-primary)]">
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Important notice ───────────────────────────────────── */}
        <div
          className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-4"
          style={{
            background: "oklch(0.32 0.14 260 / 0.04)",
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 240ms both",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Before we proceed
          </p>
          <ul className="flex flex-col gap-4">
            {NOTICE_ITEMS.map(({ icon: Icon, text }, i) => (
              <li
                key={i}
                className="flex items-start gap-3"
                style={{
                  opacity: 0,
                  animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${320 + i * 80}ms both`,
                }}
              >
                <Icon
                  size={16}
                  weight="duotone"
                  className="mt-0.5 shrink-0 text-brand-blue"
                />
                <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-3"
          style={{
            opacity: 0,
            animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 560ms both",
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
