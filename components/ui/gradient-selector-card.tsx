"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PaymentHistoryOption {
  id: string;
  label: string;
  value: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

// Gradient: dark emerald → teal-blue → brand blue
export const PAYMENT_HISTORY_SLIDER_OPTIONS: PaymentHistoryOption[] = [
  {
    id: "on_time",
    label: "Always On-time",
    value: "on_time",
    color: "#059669",
    gradientFrom: "#059669",
    gradientTo: "#0A94A0",
  },
  {
    id: "late_14",
    label: "Up to 14 days late",
    value: "late_14",
    color: "#0A94A0",
    gradientFrom: "#0A94A0",
    gradientTo: "#0B7CB4",
  },
  {
    id: "late_30",
    label: "Up to 30 days late",
    value: "late_30",
    color: "#0B7CB4",
    gradientFrom: "#0B7CB4",
    gradientTo: "#0A55A8",
  },
  {
    id: "late_60",
    label: "Up to 60 days late",
    value: "late_60",
    color: "#0A55A8",
    gradientFrom: "#0A55A8",
    gradientTo: "#0033AA",
  },
  {
    id: "bad_debt",
    label: "More than 60 days late",
    value: "bad_debt",
    color: "#0033AA",
    gradientFrom: "#0033AA",
    gradientTo: "#001F88",
  },
];

interface PaymentHistorySelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function PaymentHistorySelector({
  value,
  onChange,
  className,
}: PaymentHistorySelectorProps) {
  const options = PAYMENT_HISTORY_SLIDER_OPTIONS;
  const selectedIndex = value
    ? options.findIndex((opt) => opt.value === value)
    : -1;
  const shouldReduceMotion = useReducedMotion();

  const handleSelect = (option: PaymentHistoryOption) => {
    onChange?.(option.value);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* ── Mobile: vertical stack ── */}
      <div className="md:hidden flex flex-col">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;

          return (
            <div key={option.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => handleSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
                onFocus={() => {
                  const y = window.scrollY;
                  requestAnimationFrame(() => window.scrollTo({ top: y }));
                }}
                className="flex items-center gap-3 py-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-md"
              >
                <div className="flex flex-col items-center w-5 shrink-0">
                  <motion.div
                    className="relative rounded-full shrink-0"
                    tabIndex={-1}
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: isSelected
                        ? option.color
                        : "var(--border-medium)",
                      boxShadow: isSelected
                        ? `0 0 12px ${option.color}70, 0 0 24px ${option.color}30`
                        : "none",
                    }}
                    animate={
                      isSelected && !shouldReduceMotion
                        ? { scale: [1, 1.12, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.35 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.88 }}
                  >
                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          repeatDelay: 1,
                          ease: "easeOut",
                        }}
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                  </motion.div>
                </div>

                <span
                  className="text-base leading-snug transition-colors duration-200"
                  style={{
                    color: isSelected ? option.color : "var(--text-secondary)",
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  {option.label}
                </span>
              </button>

              {index < options.length - 1 && (
                <div className="pl-[9px]">
                  <div
                    className="w-0.5 h-4 rounded-full transition-all duration-300"
                    style={{ background: "var(--border-medium)" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: horizontal track ── */}
      <div className="hidden md:flex flex-col gap-3">
        {/* Track: circles spaced with justify-between; background line between their centers */}
        <div className="relative flex justify-between items-center">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
            style={{ left: 10, right: 10, background: "var(--border-medium)" }}
          />
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;
            return (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className="relative z-10 rounded-full shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: isSelected
                    ? option.color
                    : "var(--border-medium)",
                  boxShadow: isSelected
                    ? `0 0 12px ${option.color}70, 0 0 24px ${option.color}30`
                    : "none",
                }}
                whileHover={shouldReduceMotion ? {} : { scale: 1.15 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.88 }}
              >
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      repeatDelay: 1,
                      ease: "easeOut",
                    }}
                    style={{ backgroundColor: option.color }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Labels: matching justify-between — each anchor is 20px wide (circle width),
            label text is absolutely positioned and centered on the circle center.
            First label overflows right, last overflows left, middles are truly centered. */}
        <div className="relative flex justify-between" style={{ height: 36 }}>
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const isFirst = index === 0;
            const isLast = index === options.length - 1;
            return (
              <div key={`lbl-${option.id}`} className="relative" style={{ width: 20 }}>
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="absolute text-[10px] leading-snug text-center focus:outline-none transition-colors duration-200"
                  style={{
                    width: 76,
                    // First: start at circle left edge, flow right
                    // Last: end at circle right edge, flow left
                    // Middle: centered on circle center (left=50% of 20px parent = 10px, minus half of 76px = 38px → net -28px from parent left)
                    ...(isFirst
                      ? { left: 0, textAlign: "left" }
                      : isLast
                      ? { right: 0, textAlign: "right" }
                      : { left: "50%", transform: "translateX(-50%)", textAlign: "center" }),
                    color: isSelected ? option.color : "var(--text-tertiary)",
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  {option.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
