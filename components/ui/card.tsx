"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface LoanOfferCardProps {
  imageUrl: string;
  imageAlt: string;
  amount: string;
  tenure: string;
  monthlyPayment: string;
  expiryText: string;
  className?: string;
}

const LoanOfferCard = React.forwardRef<HTMLDivElement, LoanOfferCardProps>(
  (
    {
      className,
      imageUrl,
      imageAlt,
      amount,
      tenure,
      monthlyPayment,
      expiryText,
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "group flex flex-col sm:flex-row overflow-hidden rounded-[var(--radius-lg)]",
          className
        )}
        style={{
          border: "1px solid oklch(0.78 0.16 178 / 0.25)",
          boxShadow: "0 0 0 4px oklch(0.78 0.16 178 / 0.06)",
        }}
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        {/* Image */}
        <div className="sm:w-2/5 w-full h-52 sm:h-auto overflow-hidden relative shrink-0">
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {/* gradient scrim on mobile bottom edge, desktop right edge */}
          <div
            className="absolute inset-0 sm:hidden"
            style={{
              background:
                "linear-gradient(to bottom, transparent 55%, oklch(0.32 0.14 260 / 0.45) 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden sm:block"
            style={{
              background:
                "linear-gradient(to right, transparent 70%, oklch(0.32 0.14 260 / 0.08) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div
          className="flex flex-col justify-center gap-4 px-6 py-6 sm:px-8 sm:py-7 sm:w-3/5"
          style={{ background: "oklch(0.32 0.14 260 / 0.04)" }}
        >
          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal">
            Pre-Approved Amount
          </p>

          {/* Hero amount */}
          <p className="font-display text-4xl font-bold tracking-tight text-brand-blue tabular-nums sm:text-5xl">
            {amount}
          </p>

          {/* Breakdown chips */}
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold text-[var(--text-secondary)]"
              style={{ background: "var(--surface-secondary)" }}
            >
              {tenure}
            </span>
            <span
              className="inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold text-[var(--text-secondary)]"
              style={{ background: "var(--surface-secondary)" }}
            >
              {monthlyPayment}
            </span>
          </div>

          {/* Expiry badge */}
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5"
            style={{
              background: "oklch(0.65 0.12 50 / 0.08)",
              border: "1px solid oklch(0.65 0.12 50 / 0.18)",
            }}
          >
            <Clock
              size={13}
              weight="duotone"
              style={{
                color: "oklch(0.55 0.14 50)",
                flexShrink: 0,
                animation: "clock-tick 3s steps(12, end) infinite",
              }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "oklch(0.45 0.12 50)" }}
            >
              {expiryText}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
);

LoanOfferCard.displayName = "LoanOfferCard";

export { LoanOfferCard };
