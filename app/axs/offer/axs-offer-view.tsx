"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LockKey,
  CalendarCheck,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import { motion, useSpring, useTransform, useReducedMotion } from "motion/react";
import {
  calculateMonthlyRepayment,
  formatCurrency,
  APPROVAL_PAGE_DISCLAIMER,
} from "@/lib/loan-form";

const AXS_OFFER_AMOUNT = 5000;
const AXS_OFFER_TENURE = 12;

// ── Helpers ──────────────────────────────────────────────────────────────────

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

function generateOfferRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return (
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("") +
    "-" +
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
}

// ── Card logo ─────────────────────────────────────────────────────────────────

function CardLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/cf-money-white-dot.png"
      alt=""
      aria-hidden="true"
      style={{ height: 14, width: "auto", objectFit: "contain", display: "block" }}
    />
  );
}

// ── Animated shine sweep overlay ──────────────────────────────────────────────

function CardShine({ play }: { play: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
      style={{ zIndex: 2 }}
    >
      <motion.div
        style={{
          position: "absolute",
          top: "-40%",
          left: 0,
          width: "45%",
          height: "180%",
          background:
            "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%)",
          transform: "skewX(-15deg)",
        }}
        initial={{ x: "-120%" }}
        animate={play ? { x: "320%" } : { x: "-120%" }}
        transition={{
          duration: 0.9,
          ease: [0.4, 0, 0.2, 1],
          delay: play ? 0.05 : 0,
        }}
      />
    </motion.div>
  );
}

// ── Offer card ────────────────────────────────────────────────────────────────

interface OfferCardProps {
  amount: number;
  tenure: number;
  offerRef: string;
  entered: boolean;
}

function OfferCard({ amount, tenure, offerRef, entered }: OfferCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [shinePlayed, setShinePlayed] = useState(false);

  // Spring values for pointer tilt
  const mouseX = useSpring(0, { stiffness: 180, damping: 28 });
  const mouseY = useSpring(0, { stiffness: 180, damping: 28 });
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);

  // Play shine once the card has entered
  useEffect(() => {
    if (entered && !shinePlayed) {
      const t = setTimeout(() => setShinePlayed(true), 700);
      return () => clearTimeout(t);
    }
  }, [entered, shinePlayed]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduceMotion) return;
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [mouseX, mouseY, shouldReduceMotion],
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const cardEntry = shouldReduceMotion
    ? { opacity: 1 }
    : {
        opacity: entered ? 1 : 0,
        y: entered ? 0 : 32,
        rotateX: entered ? -2 : -8,
      };

  return (
    <motion.div
      style={{ perspective: 900 }}
      initial={false}
      animate={cardEntry}
      transition={{ duration: 0.7, ease: EASE_OUT }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          shouldReduceMotion
            ? {}
            : {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
        }
        className="relative w-full select-none rounded-[18px] overflow-hidden"
        // Credit-card aspect ratio ~ 1.586:1
        css-aspect-ratio="1.586"
      >
        {/* Card body */}
        <div
          className="relative w-full rounded-[18px] overflow-hidden"
          style={{
            aspectRatio: "1.586 / 1",
            background: `
              radial-gradient(ellipse at 30% 40%, oklch(0.38 0.20 260) 0%, transparent 60%),
              linear-gradient(145deg, oklch(0.30 0.16 262) 0%, oklch(0.24 0.18 258) 100%)
            `,
            boxShadow:
              "0 24px 60px oklch(0.24 0.18 258 / 0.55), 0 4px 16px oklch(0.24 0.18 258 / 0.30), inset 0 1px 0 oklch(1 0 0 / 0.10)",
          }}
        >
          <CardShine play={shinePlayed} />

          {/* Decorative circle top-right */}
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-12 w-44 h-44 rounded-full"
            style={{
              background: "oklch(0.78 0.16 178 / 0.08)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full"
            style={{
              background: "oklch(0.78 0.16 178 / 0.06)",
            }}
          />

          {/* Card content */}
          <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <p
                className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                style={{ color: "oklch(0.78 0.16 178 / 0.95)" }}
              >
                Personal Loan
              </p>
              <CardLogo />
            </div>

            {/* Amount — centre-bottom of card face */}
            <div>
              <p
                className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1"
                style={{ color: "oklch(1 0 0 / 0.38)" }}
              >
                Approved Amount
              </p>
              <p
                className="tabular-nums leading-none"
                style={{
                  fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
                  fontSize: "clamp(2.2rem, 9vw, 3rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "#ffffff",
                  textShadow: "0 2px 12px oklch(0.24 0.18 258 / 0.5)",
                }}
              >
                {formatCurrency(amount)}
                <sup
                  style={{
                    fontSize: "0.42em",
                    verticalAlign: "super",
                    letterSpacing: 0,
                    opacity: 0.65,
                  }}
                >
                  *
                </sup>
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex items-end justify-between">
              <div>
                <p
                  className="text-[9px] font-medium tracking-[0.14em] uppercase"
                  style={{ color: "oklch(1 0 0 / 0.35)" }}
                >
                  Offer Valid For
                </p>
                <p
                  className="text-sm font-bold tracking-tight"
                  style={{ color: "oklch(1 0 0 / 0.80)" }}
                >
                  3 Days
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-[9px] font-medium tracking-[0.14em] uppercase"
                  style={{ color: "oklch(1 0 0 / 0.35)" }}
                >
                  Ref
                </p>
                <p
                  className="text-[11px] font-bold tabular-nums tracking-wider"
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    color: "oklch(1 0 0 / 0.70)",
                  }}
                >
                  {offerRef}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Commitment items ──────────────────────────────────────────────────────────

const COMMITMENTS = [
  {
    Icon: LockKey,
    label: "No obligation",
    detail: "Only decide at your appointment.",
  },
  {
    Icon: CalendarCheck,
    label: "30-min verification",
    detail: "In-person at our branch.",
  },
  {
    Icon: CurrencyCircleDollar,
    label: "Same-day transfer",
    detail: "Funds via PayNow on the spot.",
  },
] as const;

// ── Main view ─────────────────────────────────────────────────────────────────

export function AxsOfferView() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const ctaRef = useRef<HTMLDivElement>(null);
  const [isCtaVisible, setIsCtaVisible] = useState(false);
  const [stage, setStage] = useState(0);
  const [offerRef, setOfferRef] = useState("----·----");

  // Set the offer ref client-side only to avoid hydration mismatch
  useEffect(() => {
    setOfferRef(generateOfferRef());
  }, []);

  // Stage: 0 = nothing, 1 = header, 2 = card, 3 = terms + CTA
  useEffect(() => {
    if (shouldReduceMotion) {
      setStage(3);
      return;
    }
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 450);
    const t3 = setTimeout(() => setStage(3), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [shouldReduceMotion]);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCtaVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const monthlyRepayment = calculateMonthlyRepayment(AXS_OFFER_AMOUNT, AXS_OFFER_TENURE);

  const handleAccept = useCallback(() => {
    router.push("/axs/book");
  }, [router]);

  const scrollToCta = useCallback(() => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Motion helpers ──
  function fadeUp(show: boolean, delay = 0) {
    return {
      initial: { opacity: 0, y: 14 },
      animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
      transition: { duration: 0.45, ease: EASE_OUT, delay: show ? delay : 0 },
    };
  }

  return (
    <div className="relative flex flex-col gap-7">

      {/* 1 ── Status eyebrow + headline */}
      <motion.div
        className="flex flex-col gap-3"
        {...fadeUp(stage >= 1)}
      >
        {/* Pulsing status badge */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full animate-ping"
              style={{ background: "var(--brand-teal-hex)", opacity: 0.55 }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--brand-teal-hex)" }}
            />
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.20em] uppercase"
            style={{ color: "var(--brand-teal-hex)" }}
          >
            Approved in Principle
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
            fontSize: "clamp(1.6rem, 5.5vw, 2.1rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.12,
            color: "var(--text-primary)",
          }}
        >
            You&apos;re pre-approved.
        </h1>

        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Secure it by booking a quick appointment below.
          <br />
          No commitment until you decide on the day.
        </p>
      </motion.div>

      {/* 2 ── The offer card */}
      <OfferCard
        amount={AXS_OFFER_AMOUNT}
        tenure={AXS_OFFER_TENURE}
        offerRef={offerRef}
        entered={stage >= 2}
      />

      {/* Disclaimer — fades in first after the card, before the terms below */}
      <motion.p
        className="text-[10px] leading-relaxed -mt-4"
        style={{ color: "var(--text-tertiary)", opacity: 0.75 }}
        {...fadeUp(stage >= 3, 0)}
      >
        *{APPROVAL_PAGE_DISCLAIMER}
      </motion.p>

      {/* 3 ── Terms + commitments */}
      <motion.div
        className="flex flex-col gap-5"
        {...fadeUp(stage >= 3, 0.05)}
      >
        {/* 2-column summary grid */}
        <div
          className="grid grid-cols-2 gap-3"
          style={{ pointerEvents: stage >= 3 ? "auto" : "none" }}
        >
          <div
            className="flex flex-col gap-2 rounded-xl px-4 py-3.5"
            style={{
              background: "var(--surface-elevated)",
              boxShadow: "0 0 0 1px var(--border-subtle)",
            }}
          >
            <span
              className="text-[10px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "var(--text-tertiary)" }}
            >
              Monthly Est.
            </span>
            <span
              className="tabular-nums font-bold"
              style={{
                fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
                fontSize: "1.25rem",
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
              }}
            >
              {formatCurrency(monthlyRepayment)}
              <span className="ml-1 text-xs font-normal opacity-50" style={{ letterSpacing: "0.04em" }}>/month*</span>
            </span>
          </div>
          <div
            className="flex flex-col gap-2 rounded-xl px-4 py-3.5"
            style={{
              background: "var(--surface-elevated)",
              boxShadow: "0 0 0 1px var(--border-subtle)",
            }}
          >
            <span
              className="text-[10px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "var(--text-tertiary)" }}
            >
              Tenure
            </span>
            <span
              className="font-bold"
              style={{
                fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
                fontSize: "1.25rem",
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
              }}
            >
              {AXS_OFFER_TENURE}
              <span className="ml-1 text-xs font-normal opacity-50" style={{ letterSpacing: "0.04em" }}>months</span>
            </span>
          </div>
        </div>

        {/* Commitment rows */}
        <div className="flex flex-col gap-0">
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            To receive your funds
          </p>
          <ul className="flex flex-col gap-3">
            {COMMITMENTS.map(({ Icon, label, detail }, i) => (
              <motion.li
                key={label}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={stage >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{
                  duration: 0.35,
                  ease: EASE_OUT,
                  delay: stage >= 3 ? 0.1 + i * 0.07 : 0,
                }}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "oklch(0.32 0.14 260 / 0.07)" }}
                >
                  <Icon
                    size={15}
                    weight="duotone"
                    style={{ color: "var(--brand-blue-hex)" }}
                  />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span
                    className="text-sm font-semibold leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {detail}
                  </span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

      </motion.div>

      {/* 4 ── CTA */}
      <motion.div
        ref={ctaRef}
        {...fadeUp(stage >= 3, 0.22)}
        style={{ pointerEvents: stage >= 3 ? "auto" : "none" }}
      >
        <button
          type="button"
          onClick={handleAccept}
          className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-extrabold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "var(--brand-teal-hex)",
            color: "var(--text-primary)",
            boxShadow: "0 4px 18px oklch(0.78 0.16 178 / 0.30)",
          }}
        >
          Secure My Offer
          <ArrowRight
            size={16}
            weight="bold"
            style={{ color: "var(--text-primary)" }}
          />
        </button>
      </motion.div>

      {/* Sticky mobile scroll hint */}
      {stage >= 3 && !isCtaVisible && (
        <div
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 300ms both" }}
        >
          <button
            type="button"
            onClick={scrollToCta}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-10 text-sm font-extrabold whitespace-nowrap transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              height: 48,
              background: "var(--brand-teal-hex)",
              color: "var(--text-primary)",
              boxShadow: "0 8px 24px oklch(0.78 0.16 178 / 0.40)",
            }}
          >
            Secure My Offer
            <ArrowRight size={16} weight="bold" style={{ color: "var(--text-primary)" }} />
          </button>
        </div>
      )}
    </div>
  );
}
