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

export const PAYMENT_HISTORY_SLIDER_OPTIONS: PaymentHistoryOption[] = [
  {
    id: "very_good",
    label: "Very Good",
    value: "very_good",
    color: "#059669",
    gradientFrom: "#059669",
    gradientTo: "#0A94A0",
  },
  {
    id: "good",
    label: "Good",
    value: "good",
    color: "#0A94A0",
    gradientFrom: "#0A94A0",
    gradientTo: "#0B7CB4",
  },
  {
    id: "average",
    label: "Average",
    value: "average",
    color: "#0B7CB4",
    gradientFrom: "#0B7CB4",
    gradientTo: "#0A55A8",
  },
  {
    id: "poor",
    label: "Poor",
    value: "poor",
    color: "#C47C1A",
    gradientFrom: "#C47C1A",
    gradientTo: "#B85C10",
  },
  {
    id: "bad_debt",
    label: "Bad Debt",
    value: "bad_debt",
    color: "#B91C1C",
    gradientFrom: "#B91C1C",
    gradientTo: "#7F1D1D",
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
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex gap-2">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isPast = selectedIndex > index;

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className="relative flex flex-1 flex-col items-center gap-2 rounded-[var(--radius-md)] border py-3 transition-colors duration-200 active:scale-[0.96]"
              style={{
                borderColor: isSelected
                  ? option.color
                  : isPast
                    ? `${option.color}60`
                    : "var(--border-subtle)",
                background: isSelected
                  ? `linear-gradient(135deg, ${option.gradientFrom} 0%, ${option.gradientTo} 100%)`
                  : isPast
                    ? `linear-gradient(135deg, ${option.gradientFrom}15 0%, ${option.gradientTo}15 100%)`
                    : "var(--surface-elevated)",
              }}
              animate={
                shouldReduceMotion
                  ? {}
                  : isSelected
                    ? { scale: 1.03 }
                    : { scale: 1 }
              }
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <span
                className="text-[11px] font-semibold text-center leading-tight px-1"
                style={{
                  color: isSelected
                    ? "#ffffff"
                    : isPast
                      ? option.color
                      : "var(--text-secondary)",
                }}
              >
                {option.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {selectedIndex >= 0 && (
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-center"
          style={{ color: options[selectedIndex].color }}
        >
          {selectedIndex === 0 && "Always paid on time — best rate applied"}
          {selectedIndex === 1 && "Mostly on time — good rate applied"}
          {selectedIndex === 2 && "Occasionally late — standard rate applied"}
          {selectedIndex === 3 && "Frequently late — reduced rate applied"}
          {selectedIndex === 4 && "Significant arrears — minimum rate applied"}
        </motion.p>
      )}
    </div>
  );
}
