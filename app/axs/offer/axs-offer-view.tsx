"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  calculateMonthlyRepayment,
  formatCurrency,
  APPROVAL_PAGE_DISCLAIMER,
} from "@/lib/loan-form";

const AXS_OFFER_AMOUNT = 5000;
const AXS_OFFER_TENURE = 12;

const EASE = [0.16, 1, 0.3, 1] as const;

function blurIn(active: boolean, delay = 0) {
  return {
    animate: active
      ? { opacity: 1, filter: "blur(0px)", y: 0 }
      : { opacity: 0, filter: "blur(12px)", y: 12 },
    transition: { type: "spring" as const, stiffness: 180, damping: 22, delay },
  };
}

const NOTICE_ITEMS = [
  {
    icon: "🔒",
    short: "Lock in this offer now",
    text: "No obligation to take the loan — only decide at your appointment.",
  },
  {
    icon: "✅",
    short: "Simple 30-minute verification",
    text: "A brief in-person discussion at our branch office.",
  },
  {
    icon: "💰",
    short: "Same-day PayNow transfer",
    text: "Funds disbursed to you on the spot.",
  },
] as const;

export function AxsOfferView() {
  const router = useRouter();
  const ctaRef = useRef<HTMLDivElement>(null);
  const [isCtaVisible, setIsCtaVisible] = useState(false);

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

  const [revealStage, setRevealStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setRevealStage(1), 400);
    const t2 = setTimeout(() => setRevealStage(2), 900);
    const t3 = setTimeout(() => setRevealStage(3), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const monthlyRepayment = calculateMonthlyRepayment(AXS_OFFER_AMOUNT, AXS_OFFER_TENURE);

  const handleAccept = useCallback(() => {
    router.push("/axs/book");
  }, [router]);

  const scrollToCta = useCallback(() => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="relative flex flex-col gap-8">

      {/* Headline */}
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "oklch(0.78 0.16 178 / 0.15)" }}
        >
          <CheckCircle size={28} weight="fill" className="text-brand-teal" />
        </motion.div>

        <div className="relative inline-block">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            style={{
              fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
              letterSpacing: "-0.04em",
              fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "var(--text-primary)",
            }}
          >
            Your offer is ready
          </motion.h1>

          {/* Animated handwritten underline — slightly tilted, natural wobble */}
          <svg
            className="absolute left-0 -bottom-3 w-full"
            height="14"
            viewBox="0 0 300 14"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.path
              d="M2 9 C 30 8.5, 70 7.8, 110 8.2 C 150 8.6, 190 7.5, 230 8.0 C 258 8.4, 280 7.2, 298 7"
              stroke="var(--text-primary)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 1.4, ease: [0.25, 0, 0.15, 1], delay: 0.75 },
                opacity: { duration: 0.1, delay: 0.75 },
              }}
            />
          </svg>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.18 }}
          className="text-sm text-[var(--text-secondary)] mt-3"
        >
          Pre-approved in principle.<br />Secure it by booking an appointment below.
        </motion.p>
      </div>

      {/* Amount */}
      <motion.p
        className="text-center tabular-nums"
        initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
        {...blurIn(revealStage >= 1)}
        style={{
          fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
          fontSize: "clamp(3rem, 14vw, 4rem)",
          fontWeight: 800,
          letterSpacing: "-0.045em",
          color: "var(--brand-blue-hex)",
          lineHeight: 1,
        }}
      >
        {formatCurrency(AXS_OFFER_AMOUNT)}
        <sup style={{ fontSize: "0.45em", verticalAlign: "super", letterSpacing: 0 }}>*</sup>
      </motion.p>

      {/* Repayment summary */}
      <motion.div
        className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 -mt-4"
        initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
        {...blurIn(revealStage >= 1, 0.08)}
      >
        <span className="text-base font-semibold text-[var(--text-secondary)]">
          {AXS_OFFER_TENURE} months
        </span>
        <span className="text-base font-semibold text-[var(--text-secondary)]">
          {formatCurrency(monthlyRepayment)}/mo est.*
        </span>
      </motion.div>

      {/* Notice items */}
      <motion.div
        className="flex flex-col gap-4 rounded-[var(--radius-md)] px-5 py-5"
        style={{
          background: "var(--surface-elevated)",
          boxShadow: "0 1px 0 0 var(--border-subtle), 0 0 0 1px var(--border-subtle)",
        }}
        initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
        {...blurIn(revealStage >= 2)}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
          To receive your funds
        </p>
        <ul className="flex flex-col gap-4">
          {NOTICE_ITEMS.map(({ icon, short, text }, i) => (
            <motion.li
              key={i}
              className="flex items-start gap-3"
              initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
              animate={
                revealStage >= 2
                  ? { opacity: 1, filter: "blur(0px)", y: 0 }
                  : { opacity: 0, filter: "blur(6px)", y: 6 }
              }
              transition={{ duration: 0.35, ease: EASE, delay: revealStage >= 2 ? i * 0.08 : 0 }}
            >
              <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
                {icon}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-snug text-[var(--text-secondary)]">
                  {short}
                </span>
                <span className="flex items-center gap-1.5 text-xs leading-relaxed text-[var(--text-tertiary)]">
                  <span className="shrink-0 font-bold text-brand-blue">→</span>
                  <span>{text}</span>
                </span>
              </span>
            </motion.li>
          ))}
        </ul>
        <motion.p
          className="text-[10px] leading-relaxed text-[var(--text-tertiary)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealStage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.4, delay: revealStage >= 2 ? 0.3 : 0 }}
        >
          *{APPROVAL_PAGE_DISCLAIMER}
        </motion.p>
      </motion.div>

      {/* CTA */}
      <motion.div
        ref={ctaRef}
        initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
        animate={
          revealStage >= 3
            ? { opacity: 1, filter: "blur(0px)", y: 0 }
            : { opacity: 0, filter: "blur(8px)", y: 8 }
        }
        transition={{ duration: 0.5, ease: EASE, delay: revealStage >= 3 ? 0.1 : 0 }}
        style={{ pointerEvents: revealStage >= 3 ? "auto" : "none" }}
      >
        <button
          type="button"
          onClick={handleAccept}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{ height: 52 }}
        >
          Secure My Offer
          <ArrowRight size={16} weight="bold" />
        </button>
      </motion.div>

      {/* Sticky mobile scroll hint */}
      {revealStage >= 3 && !isCtaVisible && (
        <div
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) 600ms both" }}
        >
          <button
            type="button"
            onClick={scrollToCta}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-10 text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-brand-teal/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
            style={{ height: 48 }}
          >
            Secure My Offer
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}
