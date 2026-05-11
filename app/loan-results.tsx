"use client";

import { useState, useEffect } from "react";
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
  CheckCircle,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
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
  moneylenderPaymentHistory?: string;
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
  /** Optional list of acknowledgement statements rendered as blue checkboxes.
   *  All must be ticked before the CTA becomes active. */
  reminderItems?: string[];
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

const EASE = [0.16, 1, 0.3, 1] as const;

function blurIn(active: boolean, delay = 0, extraStyle?: React.CSSProperties) {
  return {
    animate: active
      ? { opacity: 1, filter: "blur(0px)", y: 0 }
      : { opacity: 0, filter: "blur(12px)", y: 12 },
    transition: { duration: 0.55, ease: EASE, delay: active ? delay : 0 },
    style: {
      pointerEvents: (active ? "auto" : "none") as React.CSSProperties["pointerEvents"],
      ...extraStyle,
    },
  };
}

/* ── Main component ───────────────────────────────────────────────── */
export function LoanResults({
  formData,
  monthlyRepayment,
  onAccept,
  reminderItems = [],
}: LoanResultsProps) {
  const [showModal, setShowModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() =>
    reminderItems.map(() => false)
  );
  const allRemindersChecked = reminderItems.length === 0 || checkedItems.every(Boolean);

  function toggleItem(index: number) {
    setCheckedItems((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  // 0 = hero only  1 = amount  2 = tenure row  3 = badge  4 = notice + CTA
  const [revealStage, setRevealStage] = useState(0);

  useEffect(() => {
    // Stage 0 → 1: wait for hero letter-by-letter + shimmer (~1.2s)
    const t1 = setTimeout(() => setRevealStage(1), 1200);
    // Stage 1 → 2: after amount blurs in (~650ms)
    const t2 = setTimeout(() => setRevealStage(2), 1200 + 650);
    // Stage 2 → 3: after tenure row blurs in (~550ms)
    const t3 = setTimeout(() => setRevealStage(3), 1200 + 650 + 550);
    // Stage 3 → 4: after badge swipes in (~500ms)
    const t4 = setTimeout(() => setRevealStage(4), 1200 + 650 + 550 + 500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <>
      {/*
        All sections are always in the DOM — this locks the full page height
        from the very first render so nothing shifts as stages reveal.
        Visibility is driven by motion's animate prop, not conditional rendering.
      */}
      <div className="flex flex-col gap-8">

        {/* ── Stage 0: "Approved in Principle" animated hero ─────── */}
        <div>
          <ContainerTextFlip
            words={["Approved in Principle"]}
            variant="primary"
            className="font-display"
          />
        </div>

        {/* ── Stage 1: Loan amount ────────────────────────────────── */}
        <motion.p
          className="font-display text-5xl sm:text-6xl font-black tracking-tighter text-brand-blue tabular-nums text-center mt-1"
          initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
          {...blurIn(revealStage >= 1)}
        >
          {formatCurrency(formData.amount)}<sup className="text-2xl sm:text-3xl align-super">*</sup>
        </motion.p>

        {/* ── Stage 2: Tenure + monthly repayment ────────────────── */}
        <motion.div
          className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 -mt-6"
          initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
          {...blurIn(revealStage >= 2)}
        >
          <span className="text-base sm:text-lg font-semibold text-[var(--text-secondary)]">
            {formData.tenure} months
          </span>
          <span className="text-base sm:text-lg font-semibold text-[var(--text-secondary)]">
            {formatCurrency(monthlyRepayment)}/mo est.
          </span>
        </motion.div>

        {/* ── Stage 3: "Offer valid" urgency badge — swipe in ─────── */}
        {/*
          overflow-hidden clips the horizontal slide without affecting vertical
          space, so the row height is reserved from mount.
        */}
        <div
          className="flex justify-center -mt-4 overflow-hidden"
          style={{ pointerEvents: revealStage >= 3 ? "auto" : "none" }}
        >
          <motion.div
            className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5"
            style={{
              background: "oklch(0.72 0.18 50 / 0.15)",
              border: "1px solid oklch(0.72 0.18 50 / 0.40)",
            }}
            initial={{ opacity: 0, x: "-120%" }}
            animate={revealStage >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: "-120%" }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
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
          </motion.div>
        </div>

        {/* ── Disclaimer (always shown, extra note for poor history) ── */}
        <motion.div
          className="flex flex-col items-center gap-1 -mt-5"
          initial={{ opacity: 0 }}
          {...blurIn(revealStage >= 3)}
        >
          <p className="text-center text-[10px] leading-relaxed text-[var(--text-tertiary)] w-full">
            *Declared moneylender history may affect the final disbursed amount.
          </p>
        </motion.div>

        {/* ── Stage 4: Notice card ────────────────────────────────── */}
        <motion.div
          className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-4"
          initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
          {...blurIn(revealStage >= 4, 0, { background: "oklch(0.32 0.14 260 / 0.03)" })}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            To receive your funds:
          </p>
          <ul className="flex flex-col gap-3 sm:gap-4">
            {NOTICE_ITEMS.map(({ icon: Icon, short, text }, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
                animate={
                  revealStage >= 4
                    ? { opacity: 1, filter: "blur(0px)", y: 0 }
                    : { opacity: 0, filter: "blur(8px)", y: 8 }
                }
                transition={{ duration: 0.4, ease: EASE, delay: revealStage >= 4 ? i * 0.1 : 0 }}
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
              </motion.li>
            ))}
          </ul>
          <motion.p
            className="text-[10px] sm:text-xs leading-relaxed text-[var(--text-tertiary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: revealStage >= 4 ? 1 : 0 }}
            transition={{ duration: 0.4, delay: revealStage >= 4 ? NOTICE_ITEMS.length * 0.1 + 0.1 : 0 }}
          >
            * The pre-approved amount shown is indicative and may vary if there are changes to your profile between now and your appointment.
          </motion.p>
        </motion.div>

        {/* ── Stage 4: Reminder checkboxes (route-specific) ────────── */}
        {reminderItems.length > 0 && (
          <motion.div
            className="flex flex-col gap-2.5"
            initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
            animate={
              revealStage >= 4
                ? { opacity: 1, filter: "blur(0px)", y: 0 }
                : { opacity: 0, filter: "blur(8px)", y: 8 }
            }
            transition={{ duration: 0.45, ease: EASE, delay: revealStage >= 4 ? 0.28 : 0 }}
            style={{ pointerEvents: revealStage >= 4 ? "auto" : "none" }}
          >
            {reminderItems.map((text, index) => {
              const checked = checkedItems[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]"
                  style={{
                    borderColor: checked ? "var(--brand-blue-hex)" : "var(--border-subtle)",
                    background: checked ? "oklch(0.32 0.14 260 / 0.06)" : "var(--surface-elevated)",
                  }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                    style={{
                      borderColor: checked ? "var(--brand-blue-hex)" : "var(--border-medium)",
                      background: checked ? "var(--brand-blue-hex)" : "transparent",
                    }}
                  >
                    {checked && <CheckCircle size={14} weight="fill" color="white" />}
                  </span>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: checked ? "var(--brand-blue-hex)" : "var(--text-secondary)" }}
                  >
                    {text}
                  </span>
                </button>
              );
            })}
            {!allRemindersChecked && (
              <p className="mt-1 text-center text-xs text-[var(--text-primary)]">
                Please acknowledge all reminders above to proceed.
              </p>
            )}
          </motion.div>
        )}

        {/* ── Stage 4: CTA ────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
          animate={
            revealStage >= 4
              ? { opacity: 1, filter: "blur(0px)", y: 0 }
              : { opacity: 0, filter: "blur(8px)", y: 8 }
          }
          transition={{ duration: 0.5, ease: EASE, delay: revealStage >= 4 ? 0.35 : 0 }}
          style={{ pointerEvents: revealStage >= 4 ? "auto" : "none" }}
        >
          <button
            type="button"
            onClick={onAccept}
            disabled={!allRemindersChecked}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
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
        </motion.div>
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
