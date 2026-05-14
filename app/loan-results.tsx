"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  ArrowDown,
  Warning,
  Clock,
  ArrowLeft,
  X,
  TrendUp,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { TextAnimation } from "@/components/ui/text-animation";
// ── Offer expiry helpers ──────────────────────────────────────────────────────

const SG_HOLIDAYS = new Set([
  "2026-01-01", "2026-02-17", "2026-02-18", "2026-03-21",
  "2026-04-03", "2026-05-01", "2026-05-27", "2026-06-01",
  "2026-08-10", "2026-11-09", "2026-12-25", "2027-01-01",
]);

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isBusinessDay(d: Date) {
  return d.getDay() !== 0 && !SG_HOLIDAYS.has(localISO(d));
}

/** Advance `from` by exactly `n` business days and return 7:30 PM on that date. */
function computeExpiry(from: Date, n = 4): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  let counted = 0;
  while (counted < n) {
    if (isBusinessDay(d)) counted++;
    if (counted < n) d.setDate(d.getDate() + 1);
  }
  d.setHours(19, 30, 0, 0);
  return d;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Offer expired";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs  = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hrs}h ${mins}m ${String(secs).padStart(2, "0")}s`;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function OfferCountdown() {
  const expiryRef = useRef<Date | null>(null);
  if (!expiryRef.current) expiryRef.current = computeExpiry(new Date());

  const [display, setDisplay] = useState(() =>
    formatCountdown(expiryRef.current!.getTime() - Date.now())
  );

  useEffect(() => {
    const tick = () =>
      setDisplay(formatCountdown(expiryRef.current!.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <>{display}</>;
}

// ─────────────────────────────────────────────────────────────────────────────

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
    emoji: "🔒",
    short: "Lock in this offer now.",
    text: "No obligation to take the loan, only decide after securing the offer.",
  },
  {
    emoji: "✅",
    short: "Simple 30-minute verification.",
    text: "A brief in-person ID appointment at our branch.",
  },
  {
    emoji: "💰",
    short: "Same-day cash or transfer.",
    text: "Funds will be disbursed to you on the spot.",
  },
];

const DETERRENT_ITEMS = [
  {
    icon: Clock,
    heading: "Offer expires in 4 days",
    body: "This in-principle approval is time-limited. If it expires, you will need to submit a full application again.",
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
  reminderItems?: string[]; // kept for backwards compatibility — no longer rendered
}

/* ── Reconsider Modal ─────────────────────────────────────────────── */
const SURVEY_REASONS = [
  { emoji: "🔍", label: "Comparing offers" },
  { emoji: "⏳", label: "Don't need for now" },
  { emoji: "💰", label: "Loan amount doesn't match my expectation" },
  { emoji: "📊", label: "Rates don't match my expectations" },
];

type ModalStep = "deterrent" | "survey" | "final";

function ReconsiderModal({
  onAccept,
  onClose,
}: {
  onAccept: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ModalStep>("deterrent");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleReasonSelect = (label: string) => {
    setSelectedReason(label);
    setStep("final");
  };

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
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--surface-secondary)] active:scale-[0.95]"
          aria-label="Close"
        >
          <X size={16} weight="bold" className="text-[var(--text-tertiary)]" />
        </button>

        {/* ── Step 1: Deterrent ─────────────────────────────────── */}
        {step === "deterrent" && (
          <>
            <div className="flex flex-col gap-2 pr-8">
              <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Are you sure?
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Your application is approved in principle. Here is what you stand to lose by waiting.
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
                      {i === 0 ? (
                        <span className="inline-flex items-baseline gap-1.5 flex-wrap">
                          Loan offer expires in:
                          <span className="font-black tracking-tight tabular-nums text-red-500">
                            <OfferCountdown />
                          </span>
                        </span>
                      ) : heading}
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
                onClick={() => setStep("survey")}
                className="text-center text-xs text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-secondary)]"
              >
                I understand, I still need more time
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Survey ───────────────────────────────────────── */}
        {step === "survey" && (
          <>
            <div className="flex flex-col gap-2 pr-8" style={{ animation: "fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
              <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
                What&apos;s your reason?
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Help us understand so we can improve. Your answer won&apos;t affect your application.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SURVEY_REASONS.map(({ emoji, label }, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleReasonSelect(label)}
                  className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-4 text-center transition-all duration-200 hover:border-brand-blue hover:bg-[var(--surface-elevated)] active:scale-[0.97]"
                  style={{
                    opacity: 0,
                    animation: `fade-up 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                  }}
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{label}</span>
                </button>
              ))}
            </div>

          </>
        )}

        {/* ── Step 3: Final chance ─────────────────────────────────── */}
        {step === "final" && (
          <>
            <div
              className="flex flex-col items-center gap-3 pt-2 text-center"
              style={{ animation: "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <span className="text-4xl">⚡</span>
              <p className="font-display text-2xl font-black tracking-tight text-brand-blue">
                Final Chance!
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] max-w-[320px]">
                Your in-principle approval is reserved. Once it expires, you&apos;ll need to reapply from scratch.
              </p>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 100ms both" }}
              >
                <ArrowRight size={16} weight="bold" />
                Yes, book my appointment now
              </button>
            </div>
          </>
        )}
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
}: LoanResultsProps) {
  const [showModal, setShowModal] = useState(false);

  const ctaRef = useRef<HTMLDivElement>(null);
  const [isCtaVisible, setIsCtaVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCtaVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToCta = useCallback(() => {
    const el = ctaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const targetY = window.scrollY + rect.bottom - window.innerHeight + 24;
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
  }, []);

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

        {/* ── Stage 0: "Approved in Principle" layered-shadow reveal ── */}
        <TextAnimation
          text="Approved in Principle!"
          color="#0033AA"
          glowColor="#0033AA"
          fontSize="clamp(2.5rem, 10vw, 3.75rem)"
          animationDuration="900ms"
        />

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
              background: "oklch(0.91 0.19 88)",
              border: "1px solid oklch(0.25 0.03 85)",
            }}
            initial={{ opacity: 0, x: "-120%" }}
            animate={revealStage >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: "-120%" }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            <Clock
              size={17}
              weight="duotone"
              style={{
                color: "oklch(0.22 0.03 85)",
                flexShrink: 0,
                animation: "clock-tick 3s steps(12, end) infinite",
              }}
            />
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: "oklch(0.20 0.03 85)" }}
            >
              Loan offer expires in:{" "}
              <span className="text-sm font-black tracking-tight">
                <OfferCountdown />
              </span>
            </span>
          </motion.div>
        </div>

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
            {NOTICE_ITEMS.map(({ emoji, short, text }, i) => (
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
                <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden="true">
                  {emoji}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium leading-snug text-[var(--text-secondary)]">{short}</span>
                  <span className="inline-flex items-center gap-1 text-xs leading-relaxed text-[var(--text-tertiary)]">
                    <span className="text-brand-blue font-bold leading-none">→</span>{text}
                  </span>
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
        {/* ── Stage 4: CTA ────────────────────────────────────────── */}
        <motion.div
          ref={ctaRef}
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            Secure My Offer Now
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

      {/* ── Floating CTA — visible on mobile when Accept button is off-screen ── */}
      {revealStage >= 4 && !isCtaVisible && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm">
          <button
            type="button"
            onClick={scrollToCta}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-brand-teal/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            Secure Offer
            <ArrowDown size={16} weight="bold" />
          </button>
        </div>
      )}

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
