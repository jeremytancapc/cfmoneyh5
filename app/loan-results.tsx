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
import { trackEvent } from "@/lib/analytics";

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

const BLANK_PARTS = { days: 0, hrs: 0, mins: 0, secs: 0, expired: false };

function useCountdownParts() {
  const expiryRef = useRef<Date | null>(null);

  const getParts = useCallback(() => {
    if (!expiryRef.current) return BLANK_PARTS;
    const ms = expiryRef.current.getTime() - Date.now();
    if (ms <= 0) return { days: 0, hrs: 0, mins: 0, secs: 0, expired: true };
    const totalSec = Math.floor(ms / 1000);
    return {
      days: Math.floor(totalSec / 86400),
      hrs:  Math.floor((totalSec % 86400) / 3600),
      mins: Math.floor((totalSec % 3600) / 60),
      secs: totalSec % 60,
      expired: false,
    };
  }, []);

  const [parts, setParts] = useState(BLANK_PARTS);

  useEffect(() => {
    expiryRef.current = computeExpiry(new Date());
    setParts(getParts());
    const id = setInterval(() => setParts(getParts()), 1000);
    return () => clearInterval(id);
  }, [getParts]);

  return { parts, expiry: expiryRef.current ?? computeExpiry(new Date()) };
}

const CONFETTI_PIECES = Array.from({ length: 32 }, (_, i) => {
  const zone = i / 32;
  const jitter = ((i * 53.7 + 0.3) % 1) * (1 / 32);
  const left = Math.min(98, Math.max(1, (zone + jitter) * 100));

  const a = ((i * 97.3)  + 0.1) % 1;
  const b = ((i * 61.8)  + 0.4) % 1;
  const c = ((i * 41.2)  + 0.7) % 1;
  const d = ((i * 29.6)  + 0.9) % 1;

  const COLORS = ["#0033AA", "#06DEC0", "#f59e0b", "#e879f9", "#34d399", "#fb923c", "#60a5fa", "#f43f5e"];
  return {
    color: COLORS[i % COLORS.length],
    left: `${left.toFixed(1)}%`,
    width:    `${(a * 7 + 5).toFixed(1)}px`,
    height:   `${(b * 7 + 6).toFixed(1)}px`,
    delay:    `${(c * 4).toFixed(2)}s`,
    duration: `${(d * 2 + 4).toFixed(2)}s`,
    rotate:   `${Math.round(a * 360)}deg`,
    drift:    `${((b - 0.5) * 50).toFixed(1)}px`,
    shape: i % 3 === 0 ? "50%" : i % 3 === 1 ? "3px" : "0%",
  };
});

function ConfettiBanner() {
  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          60%  { opacity: 0.9; }
          85%  { opacity: 0; }
          100% { transform: translateY(55vh) translateX(var(--drift)) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
      <div
        className="pointer-events-none overflow-hidden"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          maskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 50%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 50%)",
        }}
      >
        {CONFETTI_PIECES.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "-12px",
              left: p.left,
              width: p.width,
              height: p.height,
              background: p.color,
              borderRadius: p.shape,
              opacity: 0,
              ["--drift" as string]: p.drift,
              ["--rot" as string]: p.rotate,
              animation: `confetti-fall ${p.duration} ${p.delay} ease-in infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function OfferCountdown() {
  const { parts } = useCountdownParts();
  if (parts.expired) return <>Offer expired</>;
  if (parts.days > 0) return <>{parts.days}d {parts.hrs}h {parts.mins}m {String(parts.secs).padStart(2, "0")}s</>;
  return <>{String(parts.hrs).padStart(2, "0")}:{String(parts.mins).padStart(2, "0")}:{String(parts.secs).padStart(2, "0")}</>;
}

const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function FlipClockBadge() {
  const { parts, expiry } = useCountdownParts();
  const expiryLabel = `ENDS ${expiry.getDate()} ${FULL_MONTHS[expiry.getMonth()].slice(0,3).toUpperCase()} ${expiry.getFullYear()}`;

  const tiles = [
    { value: parts.days,  label: "Day"  },
    { value: parts.hrs,   label: "Hour" },
    { value: parts.mins,  label: "Min"  },
    { value: parts.secs,  label: "Sec"  },
  ];

  if (parts.expired) return (
    <div className="flex justify-center">
      <span className="text-sm font-semibold text-red-500">Offer expired</span>
    </div>
  );

  return (
    <div
      className="w-full rounded-[var(--radius-lg)] px-5 py-5 flex flex-col items-center gap-4"
      style={{ background: "#111827" }}
    >
      <p className="text-[11px] font-bold tracking-[0.18em] text-white/60 uppercase">{expiryLabel}</p>

      <div className="flex items-stretch gap-3">
        {tiles.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-4"
            style={{ background: "#1f2937", minWidth: 64 }}
          >
            <span
              className="font-display text-4xl font-black tabular-nums leading-none"
              style={{ color: "#f59e0b" }}
            >
              {String(value).padStart(2, "0")}
            </span>
            <span className="text-[11px] font-medium text-white/50 tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] font-semibold tracking-[0.12em] text-white/40 uppercase">Time Remaining</p>
    </div>
  );
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
    short: "Lock in this offer now",
    text: "No obligation to take the loan, only decide later.",
  },
  {
    emoji: "✅",
    short: "Simple 30-minute verification",
    text: "A brief in-person discussion at our branch office.",
  },
  {
    emoji: "💰",
    short: "Same-day PayNow transfer",
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
  reminderItems?: string[];
}

/* ── Reconsider Modal ─────────────────────────────────────────────── */
const SURVEY_REASONS = [
  { emoji: "🔍", label: "Shopping around" },
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
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "oklch(0.15 0.04 260 / 0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative flex w-full max-w-sm flex-col gap-6 rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] bg-[var(--surface-base)] px-6 py-8"
        style={{ animation: "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-secondary)]"
        >
          <X size={14} weight="bold" />
        </button>

        {step === "deterrent" && (
          <>
            <div className="flex flex-col gap-2">
              <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Before you go...
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Here&apos;s what you&apos;ll lose if you close this offer:
              </p>
            </div>

            <ul className="flex flex-col gap-4">
              {DETERRENT_ITEMS.map(({ icon: Icon, heading, body }) => (
                <li key={heading} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-red-50">
                    <Icon size={16} weight="duotone" className="text-red-500" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{heading}</p>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              >
                <ArrowRight size={16} weight="bold" />
                Secure my offer now
              </button>
              <button
                type="button"
                onClick={() => setStep("survey")}
                className="text-center text-sm text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-secondary)]"
              >
                I still want to leave
              </button>
            </div>
          </>
        )}

        {step === "survey" && (
          <>
            <div className="flex flex-col gap-2">
              <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Quick question
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                What&apos;s the main reason you&apos;re not proceeding today?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {SURVEY_REASONS.map(({ emoji, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleReasonSelect(label)}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left text-sm font-medium transition-all duration-200 active:scale-[0.98]"
                  style={{
                    borderColor: selectedReason === label ? "var(--brand-blue-hex)" : "var(--border-subtle)",
                    background: selectedReason === label ? "var(--brand-blue-hex)" : "var(--surface-elevated)",
                    color: selectedReason === label ? "#fff" : "var(--text-primary)",
                  }}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!selectedReason}
                onClick={() => setStep("final")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
              >
                Continue
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>
          </>
        )}

        {step === "final" && (
          <>
            <div className="flex flex-col gap-2 text-center">
              <p className="text-3xl">⏰</p>
              <p className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
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
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const [revealStage, setRevealStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealStage(1), 1200);
    const t2 = setTimeout(() => setRevealStage(2), 1200 + 650);
    const t3 = setTimeout(() => setRevealStage(3), 1200 + 650 + 550);
    const t4 = setTimeout(() => setRevealStage(4), 1200 + 650 + 550 + 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const handleAccept = useCallback(() => {
    trackEvent("step_10_offer_accepted");
    onAccept();
  }, [onAccept]);

  return (
    <>
      <div className="relative z-[1] flex flex-col gap-8">
        <TextAnimation
          text="Approved in Principle!"
          color="#0033AA"
          fontSize="clamp(2.5rem, 10vw, 3.75rem)"
          animationDuration="900ms"
        />

        <motion.p
          className="font-display text-5xl sm:text-6xl font-black tracking-tighter text-brand-blue tabular-nums text-center mt-1"
          initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
          {...blurIn(revealStage >= 1)}
        >
          {formatCurrency(formData.amount)}<sup className="text-2xl sm:text-3xl align-super">*</sup>
        </motion.p>

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

        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={revealStage >= 3 ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 16, filter: "blur(8px)" }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        >
          <FlipClockBadge />
        </motion.div>

        <motion.div
          className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-4"
          initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
          {...blurIn(revealStage >= 4, 0, {
            background: "var(--surface-elevated)",
            boxShadow: "0 4px 24px 0 oklch(0.32 0.14 260 / 0.18), 0 1px 4px 0 oklch(0.32 0.14 260 / 0.12)",
          })}
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
                  <span className="flex items-center gap-1.5 text-xs leading-relaxed text-[var(--text-tertiary)]">
                    <span className="shrink-0 text-brand-blue font-bold">→</span>
                    <span>{text}</span>
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
            onClick={handleAccept}
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

      {revealStage >= 4 && !isCtaVisible && (
        <div
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 850ms both" }}
        >
          <button
            type="button"
            onClick={scrollToCta}
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-12 text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-brand-teal/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
          >
            Secure Offer
            <ArrowDown size={16} weight="bold" />
          </button>
        </div>
      )}

      {showModal && (
        <ReconsiderModal
          onAccept={handleAccept}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
