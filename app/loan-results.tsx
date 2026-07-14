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
  LockKey,
  CalendarCheck,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { trackEvent } from "@/lib/analytics";
import { APPROVAL_PAGE_DISCLAIMER } from "@/lib/loan-form";

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

  return {
    parts,
    expiry: expiryRef.current ?? computeExpiry(new Date()),
  };
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
  leadId?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Deadline strip (replaces FlipClockBadge) ─────────────────────────────────

const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Split-flap (airport board) tile ──────────────────────────────────────────

const FLIP_TILE_W = 34;
const FLIP_TILE_H = 30;
const FLIP_DURATION_MS = 250;

const flipDigitStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: "200%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
  fontSize: "1rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: "#ffffff",
  fontVariantNumeric: "tabular-nums",
};

/** One half (top or bottom) of a flip tile, clipping a full-height digit. */
function FlipHalf({
  pos,
  text,
  style,
}: {
  pos: "top" | "bottom";
  text: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: pos === "top" ? 0 : "50%",
        height: "50%",
        overflow: "hidden",
        background: pos === "top" ? "#1a1a1e" : "#0e0e11",
        borderRadius: pos === "top" ? "4px 4px 0 0" : "0 0 4px 4px",
        backfaceVisibility: "hidden",
        ...style,
      }}
    >
      <span style={{ ...flipDigitStyle, top: pos === "top" ? 0 : "-100%" }}>{text}</span>
    </div>
  );
}

/** Airport-style split-flap tile: black background, white digits, flips on change. */
function FlipTile({ value, label, labelColor }: { value: number; label: string; labelColor: string }) {
  const display = String(value).padStart(2, "0");
  const [shown, setShown] = useState(display);
  const isFlipping = display !== shown;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        style={{
          position: "relative",
          width: FLIP_TILE_W,
          height: FLIP_TILE_H,
          perspective: 240,
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
          borderRadius: 4,
        }}
      >
        {/* Static top half — already shows the incoming value */}
        <FlipHalf pos="top" text={isFlipping ? display : shown} />
        {/* Static bottom half — keeps the outgoing value until the flap lands */}
        <FlipHalf pos="bottom" text={shown} />

        {isFlipping && (
          <>
            {/* Outgoing top flap: folds down */}
            <FlipHalf
              key={`t-${display}`}
              pos="top"
              text={shown}
              style={{
                zIndex: 2,
                transformOrigin: "50% 100%",
                animation: `flip-top-down ${FLIP_DURATION_MS}ms ease-in both`,
              }}
            />
            {/* Incoming bottom flap: folds up into place */}
            <div
              key={`b-${display}`}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                transformOrigin: "50% 50%",
              }}
              onAnimationEnd={() => setShown(display)}
            >
              <FlipHalf
                pos="bottom"
                text={display}
                style={{
                  transformOrigin: "50% 0%",
                  animation: `flip-bottom-up ${FLIP_DURATION_MS}ms ${FLIP_DURATION_MS}ms ease-out both`,
                }}
              />
            </div>
          </>
        )}

        {/* Centre seam */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.14)",
            zIndex: 3,
            transform: "translateY(-0.5px)",
          }}
        />
      </div>
      <span
        className="text-[9px] font-semibold tracking-wider uppercase leading-none"
        style={{ color: labelColor }}
      >
        {label}
      </span>
    </div>
  );
}

function DeadlineStrip() {
  const { parts, expiry } = useCountdownParts();

  const h = expiry.getHours();
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  const expiryDate = `${expiry.getDate()} ${FULL_MONTHS[expiry.getMonth()].slice(0, 3)} ${expiry.getFullYear()}`;
  const expiryTime = `${hour12}:${String(expiry.getMinutes()).padStart(2, "0")} ${ampm}`;

  const remainingMs = parts.expired ? 0 : (
    (parts.days * 86400 + parts.hrs * 3600 + parts.mins * 60 + parts.secs) * 1000
  );
  const totalWindowMs = 4 * 24 * 60 * 60 * 1000;
  const progress = Math.max(0, Math.min(1, remainingMs / totalWindowMs));

  const isUrgent = parts.days < 1 && !parts.expired;

  // Colour scheme toggles between amber (normal) and red (urgent)
  const scheme = isUrgent
    ? {
        bg: "oklch(0.96 0.03 25)",
        border: "oklch(0.85 0.06 25)",
        leftBar: "#dc2626",
        labelColor: "#7f1d1d",
        dateColor: "#450a0a",
        unitColor: "#991b1b",
        trackBg: "oklch(0.90 0.04 25)",
        barGradient: "linear-gradient(to right, #dc2626, #f97316)",
      }
    : {
        bg: "oklch(0.97 0.03 85)",
        border: "oklch(0.88 0.06 85)",
        leftBar: "#f59e0b",
        labelColor: "#78350f",
        dateColor: "var(--text-primary)",
        unitColor: "#92400e",
        trackBg: "oklch(0.92 0.04 85)",
        barGradient: "linear-gradient(to right, #f59e0b, #fbbf24)",
      };

  if (parts.expired) {
    return (
      <div
        className="w-full rounded-[var(--radius-md)] overflow-hidden flex"
        style={{
          background: "oklch(0.96 0.03 25)",
          boxShadow: "0 0 0 1px oklch(0.85 0.06 25)",
        }}
      >
        {/* Red left accent bar */}
        <div className="w-1 shrink-0 self-stretch" style={{ background: "#dc2626" }} aria-hidden="true" />

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-start gap-3 px-4 py-3.5">
            {/* Icon */}
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "oklch(0.91 0.05 25)" }}
            >
              <Warning size={17} weight="duotone" style={{ color: "#dc2626" }} />
            </span>

            {/* Text block */}
            <div className="flex flex-col gap-1 min-w-0">
              <p
                className="text-sm font-bold leading-snug"
                style={{
                  fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
                  color: "#450a0a",
                  letterSpacing: "-0.02em",
                }}
              >
                Offer expired
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "#7f1d1d" }}
              >
                Expired {expiryDate}, {expiryTime}. Submit a new application to receive a fresh offer.
              </p>
            </div>
          </div>

          {/* Fully depleted progress bar */}
          <div
            className="h-[3px] w-full"
            style={{ background: "oklch(0.90 0.04 25)" }}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-[var(--radius-md)] overflow-hidden flex"
      style={{
        background: scheme.bg,
        boxShadow: `0 0 0 1px ${scheme.border}`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="w-1 shrink-0 self-stretch"
        style={{ background: scheme.leftBar }}
        aria-hidden="true"
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Main row */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: label + date */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: scheme.labelColor }}
            >
              Offer expires
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: scheme.dateColor }}
            >
              {expiryDate}, {expiryTime}
            </span>
          </div>

          {/* Right: split-flap tiles */}
          <div className="flex items-start gap-1">
            {[
              { value: parts.days, label: "d" },
              { value: parts.hrs, label: "h" },
              { value: parts.mins, label: "m" },
              { value: parts.secs, label: "s" },
            ].map(({ value, label }, i) => (
              <div key={label} className="flex items-start gap-1">
                {i > 0 && (
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      color: scheme.unitColor,
                      opacity: 0.5,
                      lineHeight: `${FLIP_TILE_H}px`,
                    }}
                  >
                    :
                  </span>
                )}
                <FlipTile value={value} label={label} labelColor={scheme.unitColor} />
              </div>
            ))}
          </div>
        </div>

        {/* Depleting progress bar */}
        <div
          className="h-[3px] w-full"
          style={{ background: scheme.trackBg }}
          aria-hidden="true"
        >
          <div
            className="h-full transition-none"
            style={{
              width: `${(progress * 100).toFixed(2)}%`,
              background: scheme.barGradient,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Term-sheet offer card ─────────────────────────────────────────────────────

interface OfferCardProps {
  formData: FormData;
  monthlyRepayment: number;
  revealStage: number;
}

function TermSheetCard({ formData, monthlyRepayment, revealStage }: OfferCardProps) {
  const today = new Date();
  const dateLabel = `${today.getDate()} ${FULL_MONTHS[today.getMonth()].slice(0, 3)} ${today.getFullYear()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={revealStage >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 30% 40%, oklch(0.38 0.20 260) 0%, transparent 60%),
          linear-gradient(145deg, oklch(0.30 0.16 262) 0%, oklch(0.24 0.18 258) 100%)
        `,
        boxShadow:
          "0 24px 60px oklch(0.24 0.18 258 / 0.45), 0 4px 16px oklch(0.24 0.18 258 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.10)",
      }}
    >
      {/* Decorative circles for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full"
        style={{ background: "oklch(0.78 0.16 178 / 0.07)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full"
        style={{ background: "oklch(0.78 0.16 178 / 0.05)" }}
      />

      {/* Card header row */}
      <div
        className="relative flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.10)" }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span
              className="absolute inline-flex h-full w-full rounded-full animate-ping"
              style={{ background: "#06DEC0", opacity: 0.55 }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "#06DEC0" }}
            />
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ color: "#06DEC0" }}
          >
            In-principle approval
          </span>
        </div>
        <span
          className="text-[11px] font-medium"
          style={{ color: "oklch(1 0 0 / 0.45)" }}
        >
          {dateLabel}
        </span>
      </div>

      {/* Approved amount */}
      <div className="relative px-5 pt-5 pb-4">
        <p
          className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2"
          style={{ color: "oklch(1 0 0 / 0.40)" }}
        >
          Approved amount
        </p>
        <p
          className="tabular-nums leading-none"
          style={{
            fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
            fontSize: "clamp(2.4rem, 9vw, 3.25rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            textShadow: "0 2px 12px oklch(0.24 0.18 258 / 0.5)",
          }}
        >
          {formatCurrency(formData.amount)}
          <sup
            style={{
              fontSize: "0.38em",
              verticalAlign: "super",
              letterSpacing: 0,
              opacity: 0.50,
            }}
          >
            *
          </sup>
        </p>
      </div>

      {/* Term rows */}
      <div
        className="relative"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.10)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.10)" }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: "oklch(1 0 0 / 0.45)" }}
          >
            Loan tenure
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
              color: "oklch(1 0 0 / 0.90)",
              letterSpacing: "-0.02em",
            }}
          >
            {formData.tenure} months*
          </span>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span
            className="text-xs font-medium"
            style={{ color: "oklch(1 0 0 / 0.45)" }}
          >
            Monthly Instalment
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
              color: "oklch(1 0 0 / 0.90)",
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(monthlyRepayment)}
            <span style={{ fontSize: "0.75em", fontWeight: 400, opacity: 0.45, marginLeft: 2 }}>/month*</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Notice items ──────────────────────────────────────────────────────────────

const NOTICE_ITEMS = [
  {
    Icon: LockKey,
    short: "Lock in this offer now",
    text: "No obligation to take the loan, only decide later.",
  },
  {
    Icon: CalendarCheck,
    short: "Simple 30-minute verification",
    text: "A brief in-person discussion at our branch office.",
  },
  {
    Icon: CurrencyCircleDollar,
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

function OfferCountdown() {
  const { parts } = useCountdownParts();
  if (parts.expired) return <>Offer expired</>;
  if (parts.days > 0) return <>{parts.days}d {parts.hrs}h {parts.mins}m {String(parts.secs).padStart(2, "0")}s</>;
  return <>{String(parts.hrs).padStart(2, "0")}:{String(parts.mins).padStart(2, "0")}:{String(parts.secs).padStart(2, "0")}</>;
}

type ModalStep = "deterrent" | "survey" | "final";

function ReconsiderModal({
  onAccept,
  onClose,
  leadId,
}: {
  onAccept: () => void;
  onClose: () => void;
  leadId?: string;
}) {
  const [step, setStep] = useState<ModalStep>("deterrent");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleReasonSelect = (label: string) => {
    setSelectedReason(label);
    // Save decline reason to lead in the background
    if (leadId) {
      fetch("/api/apply/decline-reason", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, reason: label }),
      }).catch(() => {});
    }
    trackEvent("step_offer_declined", { reason: label });
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
        {/* Close button — hidden on final step */}
        {step !== "final" && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--surface-secondary)] active:scale-[0.95]"
            aria-label="Close"
          >
            <X size={16} weight="bold" className="text-[var(--text-tertiary)]" />
          </button>
        )}

        {/* ── Step 1: Deterrent ─────────────────────────────────── */}
        {step === "deterrent" && (
          <>
            <div className="flex flex-col gap-2 pr-8">
              <p
                className="text-xl font-bold tracking-tight text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif", letterSpacing: "-0.03em" }}
              >
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
                  style={{ opacity: 0, animation: `fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both` }}
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
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
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

        {/* ── Step 2: Survey ─────────────────────────────────────── */}
        {step === "survey" && (
          <>
            <div
              className="flex flex-col gap-2 pr-8"
              style={{ animation: "fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <p
                className="text-xl font-bold tracking-tight text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif", letterSpacing: "-0.03em" }}
              >
                No worries, mind sharing why?
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
                  style={{ opacity: 0, animation: `fade-up 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}
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
              <p
                className="text-2xl font-black tracking-tight text-brand-blue"
                style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif", letterSpacing: "-0.04em" }}
              >
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
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

/* ── Main component ───────────────────────────────────────────────── */
export function LoanResults({
  formData,
  monthlyRepayment,
  onAccept,
}: LoanResultsProps) {
  const [showModal, setShowModal] = useState(false);
  const { parts: expiryParts } = useCountdownParts();
  const isExpired = expiryParts.expired;

  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);
  const [isCtaVisible, setIsCtaVisible] = useState(false);

  useEffect(() => {
    // Observe the actual button (not the wrapper) with a bottom margin equal to
    // the sticky button height + gap (~80px) so the sticky disappears before overlap.
    const el = ctaButtonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCtaVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
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
    const t1 = setTimeout(() => setRevealStage(1), 300);
    const t2 = setTimeout(() => setRevealStage(2), 800);
    const t3 = setTimeout(() => setRevealStage(3), 1200);
    const t4 = setTimeout(() => setRevealStage(4), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const handleAccept = useCallback(() => {
    trackEvent("step_10_offer_accepted");
    onAccept();
  }, [onAccept]);

  return (
    <>
      <div className="relative z-[1] flex flex-col gap-5">

        {/* Eyebrow heading */}
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <h1
            style={{
              fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
              fontSize: "clamp(1.5rem, 5vw, 1.9rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: isExpired ? "#7f1d1d" : "var(--text-primary)",
            }}
          >
            {isExpired ? "Your offer has expired." : "You\u2019re pre-approved."}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {isExpired
              ? "This in-principle approval is no longer valid. Start a new application to get a fresh offer."
              : <>Secure it by booking a quick appointment below.<br />No commitment until you decide on the day.</>
            }
          </p>
        </motion.div>

        {/* Term-sheet card — dimmed when expired */}
        <div style={isExpired ? { opacity: 0.5, filter: "grayscale(0.4)", pointerEvents: "none" } : undefined}>
          <TermSheetCard
            formData={formData}
            monthlyRepayment={monthlyRepayment}
            revealStage={revealStage}
          />
        </div>

        {/* Deadline strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={revealStage >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <DeadlineStrip />
        </motion.div>

        {/* Disclaimer below the deadline strip */}
        <motion.p
          className="text-[10px] leading-relaxed -mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealStage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.4, delay: revealStage >= 2 ? 0.2 : 0 }}
          style={{ color: "var(--text-secondary)", position: "relative", zIndex: 1, textAlign: "center" }}
        >
          *{APPROVAL_PAGE_DISCLAIMER}
        </motion.p>

        {/* To receive your funds */}
        <motion.div
          className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-4"
          initial={{ opacity: 0, y: 12 }}
          animate={revealStage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{
            pointerEvents: revealStage >= 3 ? "auto" : "none",
            background: "var(--surface-elevated)",
            boxShadow: "0 0 0 1px var(--border-subtle)",
          }}
        >
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            To receive your funds
          </p>
          <ul className="flex flex-col gap-4">
            {NOTICE_ITEMS.map(({ Icon, short, text }, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={
                  revealStage >= 3
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: -8 }
                }
                transition={{ duration: 0.35, ease: EASE, delay: revealStage >= 3 ? i * 0.08 : 0 }}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "oklch(0.32 0.14 260 / 0.07)" }}
                >
                  <Icon size={15} weight="duotone" style={{ color: "var(--brand-blue-hex, #0033AA)" }} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                    {short}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                    {text}
                  </span>
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          ref={ctaRef}
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={revealStage >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ pointerEvents: revealStage >= 4 ? "auto" : "none" }}
        >
          {isExpired ? (
            <a
              ref={ctaButtonRef as unknown as React.RefObject<HTMLAnchorElement>}
              href="/"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              Start a New Application
              <ArrowRight size={16} weight="bold" />
            </a>
          ) : (
            <>
              <button
                ref={ctaButtonRef}
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
            </>
          )}
        </motion.div>
      </div>

      {revealStage >= 4 && !isCtaVisible && (
        <div
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 850ms both" }}
        >
          {isExpired ? (
            <a
              href="/"
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue px-10 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
            >
              Start New Application
              <ArrowDown size={16} weight="bold" />
            </a>
          ) : (
            <button
              type="button"
              onClick={scrollToCta}
              className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-12 text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-brand-teal/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
            >
              Secure Offer
              <ArrowDown size={16} weight="bold" />
            </button>
          )}
        </div>
      )}

      {showModal && (
        <ReconsiderModal
          onAccept={handleAccept}
          onClose={() => setShowModal(false)}
          leadId={formData.leadId ?? undefined}
        />
      )}
    </>
  );
}
