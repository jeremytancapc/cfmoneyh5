"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import type { LoanFormData as FormData } from "@/lib/loan-form";
import {
  CalendarBlank,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Train,
  Car,
} from "@phosphor-icons/react";

// Singapore 2026 public holidays (YYYY-MM-DD, local dates)
const SG_PUBLIC_HOLIDAYS_2026 = new Set([
  "2026-01-01", // New Year's Day
  "2026-02-17", // Chinese New Year
  "2026-02-18", // Chinese New Year (2nd day)
  "2026-03-21", // Hari Raya Puasa (Saturday)
  "2026-04-03", // Good Friday
  "2026-05-01", // Labour Day
  "2026-05-27", // Hari Raya Haji
  "2026-06-01", // Vesak Day in-lieu (31 May falls on Sunday)
  "2026-08-10", // National Day in-lieu (9 Aug falls on Sunday)
  "2026-11-09", // Deepavali in-lieu (8 Nov falls on Sunday)
  "2026-12-25", // Christmas Day
  "2027-01-01", // New Year's Day 2027
]);

// 30-min slots from 10:30 to 19:00 (last appointment at 19:00, ends 19:30)
const TIME_SLOTS = [
  "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Seeded PRNG (LCG) — deterministic stream from a date string seed. */
function makePrng(date: string) {
  let seed = 0;
  for (let i = 0; i < date.length; i++) {
    seed = Math.imul(31, seed) + date.charCodeAt(i) | 0;
  }
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 0x100000000;
  };
}

/** 3–5 scattered "limited spots" indices per day, never the fully-booked slot. */
function limitedSlotIndices(date: string, bookedIdx: number): Set<number> {
  const rand = makePrng(date + "limited");
  const count = 3 + Math.floor(rand() * 3); // 3, 4 or 5
  const indices = new Set<number>();
  let guard = 0;
  while (indices.size < count && guard++ < 60) {
    const idx = Math.floor(rand() * TIME_SLOTS.length);
    if (idx !== bookedIdx) indices.add(idx);
  }
  return indices;
}

/** One slot per day is fully booked — deterministic but varies each day. */
function fullyBookedIndex(date: string): number {
  const rand = makePrng(date + "booked");
  return Math.floor(rand() * TIME_SLOTS.length);
}

function isDisabledDate(date: Date): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return true; // Sunday
  const iso = toISODate(date);
  return SG_PUBLIC_HOLIDAYS_2026.has(iso);
}

function formatDisplayDate(date: Date): string {
  return `${DAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDisplayTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour = h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

interface AppointmentBookingProps {
  formData: FormData;
  onBack?: () => void;
  onConfirm?: (date: string, time: string) => void;
  thingsToBring?: string[];
}

const WHAT_TO_BRING = {
  sg_pr: [
    "NRIC (original / SingPass)",
    "Latest 1–3 months payslip or income documents or bank statement",
    "SingPass on your phone",
    "If you have CPF / NOA history, no need to bring any income documents",
  ],
  foreigner: [
    "Work Pass (WP / SP / EP / LTVP) with at least 3 months validity",
    "Latest 1–3 months payslip",
    "SingPass on your phone",
    "Latest month proof of residence with your name and SG address (bank statement / utility bill / mobile bill)",
  ],
} as const;

function WhatToBring({ idType }: { idType: string }) {
  const defaultTab = idType === "foreigner" ? "foreigner" : "sg_pr";
  const [tab, setTab] = useState<"sg_pr" | "foreigner">(defaultTab as "sg_pr" | "foreigner");
  const items = WHAT_TO_BRING[tab];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-5 text-left">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
        Things to bring
      </p>

      {/* Tab toggle */}
      <div className="flex gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-1 w-fit">
        {(["sg_pr", "foreigner"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-200"
            style={{
              background: tab === t ? "var(--brand-teal-hex)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {t === "sg_pr" ? "Singaporean / PR" : "Foreigner"}
          </button>
        ))}
      </div>

      {/* Checklist — 2-col on sm+ */}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle
              size={15}
              weight="duotone"
              className="mt-0.5 shrink-0 text-brand-teal"
            />
            <span className="text-sm leading-snug text-[var(--text-secondary)]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AppointmentBooking({ formData, onBack, onConfirm, thingsToBring = [] }: AppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const confirmBtnRef = useRef<HTMLDivElement>(null);
  const timeSectionRef = useRef<HTMLDivElement>(null);

  // Calendar month state — 1st of the displayed month
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Generate the next 14 days as the booking window
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 14);
    return d;
  }, [today]);

  // Current time for filtering slots on today (2-hour advance required)
  const isSlotDisabled = (slot: string): boolean => {
    if (!selectedDate) return false;
    if (selectedDate !== toISODate(today)) return false;
    const [h, m] = slot.split(":").map(Number);
    const slotMinutes = h * 60 + m;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes < nowMinutes + 120; // 2-hour buffer
  };

  const isDateInWindow = (date: Date): boolean => {
    const t = date.getTime();
    return t >= today.getTime() && t <= maxDate.getTime();
  };

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const [y, mo, d] = selectedDate.split("-").map(Number);
    return new Date(y, mo - 1, d);
  }, [selectedDate]);

  const canConfirm = selectedDate !== null && selectedTime !== null;

  if (confirmed && selectedDateObj && selectedTime) {
    return (
      <div className="animate-fade-up flex flex-col gap-8 pt-6 text-center sm:pt-0 sm:text-left">
        {/* Success state */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <CheckCircle
              size={18}
              weight="duotone"
              className="shrink-0 text-brand-teal"
            />
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              Appointment confirmed
            </span>
          </div>
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {formatDisplayDate(selectedDateObj)}
            </p>
            <p className="mt-1 text-lg font-semibold text-brand-blue">
              {formatDisplayTime(selectedTime)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              We recommend arriving 15 mins before your timeslot so that we can facilitate your appointment on time.
            </p>
          </div>
        </div>

        {/* ── What to bring ───────────────────────────────────────── */}
        <WhatToBring idType={formData.idType} />

        {/* Office details — hidden on desktop (shown in sidebar) */}
        <div className="flex flex-col gap-4 text-left lg:hidden">
          {/* Landscape shopfront image */}
          <div className="relative h-44 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <img
              src="/images/cf-money-shopfront.jpg"
              alt="CF Money office shopfront at 1 North Bridge Road"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "35% center", transform: "scale(1.35)", transformOrigin: "35% center" }}
              loading="lazy"
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Our office
            </h3>

            <div className="flex items-start gap-3">
              <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0 text-brand-blue" />
              <a
                href="https://maps.app.goo.gl/Cs9Av94qW3NHh7wY6"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col transition-opacity duration-200 hover:opacity-75"
              >
                <p className="text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-medium)] underline-offset-2 group-hover:decoration-brand-blue">
                  1 North Bridge Road, High Street Centre
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-medium)] underline-offset-2 group-hover:decoration-brand-blue">
                  #01-35, Singapore 179094
                </p>
              </a>
            </div>

            <div className="flex items-start gap-3">
              <Clock size={16} weight="duotone" className="mt-0.5 shrink-0 text-brand-blue" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Mon &ndash; Sat &nbsp;&middot;&nbsp; 10:30am &ndash; 7:30pm
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Closed on Sundays &amp; Public Holidays
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Train size={16} weight="duotone" className="mt-0.5 shrink-0 text-brand-blue" />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                City Hall MRT (Exit B) or Clarke Quay MRT (Exit E)
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Car size={16} weight="duotone" className="mt-0.5 shrink-0 text-brand-blue" />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Multi-storey carpark in the building
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-[var(--border-subtle)]" />

        <div className="flex flex-col gap-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          <p>We look forward to meeting you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="relative flex flex-col gap-2"
        style={{
          opacity: 0,
          animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0ms both",
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-secondary)] active:scale-[0.95]"
          >
            <ArrowLeft size={14} weight="bold" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-blue/[0.06]">
          <CalendarBlank size={18} weight="duotone" className="text-brand-blue" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Finalise your loan details
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] max-w-[42ch] sm:max-w-none">
          Book a private session with your Relationship Manager to discuss your personalised loan.
        </p>
      </div>

      {/* ── Date picker — monthly calendar ─────────────────────── */}
      <div
        style={{
          opacity: 0,
          animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 80ms both",
        }}
      >
        <p className="mb-3 text-base font-bold text-[var(--text-primary)]">Select a date</p>

        {/* Calendar card */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--brand-blue-hex)" }}>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                const d = new Date(calendarMonth);
                d.setMonth(d.getMonth() - 1);
                setCalendarMonth(d);
              }}
              disabled={
                calendarMonth.getFullYear() === today.getFullYear() &&
                calendarMonth.getMonth() === today.getMonth()
              }
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft size={13} weight="bold" />
            </button>

            <p className="text-sm font-semibold text-white">
              {["January","February","March","April","May","June","July","August","September","October","November","December"][calendarMonth.getMonth()]}{" "}
              {calendarMonth.getFullYear()}
            </p>

            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                const d = new Date(calendarMonth);
                d.setMonth(d.getMonth() + 1);
                setCalendarMonth(d);
              }}
              disabled={(() => {
                // Disable if no valid dates exist in next month
                const nextMonth = new Date(calendarMonth);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const firstOfNext = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
                return firstOfNext > maxDate;
              })()}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>

          {/* Day-of-week headers — Mon first */}
          <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 p-2 gap-1">
            {(() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              // Monday-first offset: Sun=0→6, Mon=1→0, …
              const startOffset = (firstDay.getDay() + 6) % 7;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const todayIso = toISODate(today);
              const cells: React.ReactNode[] = [];

              // Blank leading cells
              for (let i = 0; i < startOffset; i++) {
                cells.push(<div key={`blank-${i}`} />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const iso = toISODate(date);
                const inWindow = isDateInWindow(date);
                const isHolidayOrSunday = isDisabledDate(date);
                const disabled = !inWindow || isHolidayOrSunday;
                const isSelected = selectedDate === iso;
                const isToday = iso === todayIso;
                const showRedDot = isHolidayOrSunday && inWindow && !isSelected;

                cells.push(
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDate(iso);
                      setSelectedTime(null);
                      setTimeout(() => {
                        const el = timeSectionRef.current;
                        if (!el) return;
                        const top = el.getBoundingClientRect().top + window.scrollY - 72;
                        window.scrollTo({ top, behavior: "smooth" });
                      }, 50);
                    }}
                    className="relative flex aspect-square items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-150 active:scale-[0.93]"
                    style={{
                      background: isSelected ? "var(--brand-blue-hex)" : "transparent",
                      color: isSelected
                        ? "#fff"
                        : disabled
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                      opacity: disabled && !inWindow ? 0.2 : disabled ? 0.35 : 1,
                      pointerEvents: disabled ? "none" : "auto",
                      fontWeight: isToday ? 800 : 500,
                    }}
                  >
                    {day}
                    {isToday && !isSelected && (
                      <span
                        className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                        style={{ background: "var(--brand-teal-hex)" }}
                      />
                    )}
                    {showRedDot && (
                      <span
                        className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                        style={{ background: "#ef4444" }}
                      />
                    )}
                  </button>
                );
              }
              return cells;
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand-teal-hex)" }} />
              Today
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "#ef4444" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              Sundays &amp; public holidays unavailable
            </span>
          </div>
        </div>
      </div>

      {/* ── Time slots ─────────────────────────────────────────── */}
      {selectedDate && (
        <div ref={timeSectionRef} className="animate-slide-in flex flex-col gap-3">
          <p className="text-base font-bold text-[var(--text-primary)]">
            Select a time
          </p>
          {/* Scrollable confined list — outer div clips corners, inner scrolls */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 280 }}
          >
            {(() => {
              const bookedIdx = fullyBookedIndex(selectedDate);
              const limitedSet = limitedSlotIndices(selectedDate, bookedIdx);
              return TIME_SLOTS.map((slot, i) => {
              const pastDisabled = isSlotDisabled(slot);
              const isFullyBooked = !pastDisabled && i === bookedIdx;
              const disabled = pastDisabled || isFullyBooked;
              const isSelected = selectedTime === slot;
              const isLimited = !disabled && limitedSet.has(i);

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSelectedTime(slot);
                    setTimeout(() => {
                      const el = confirmBtnRef.current;
                      if (!el) return;
                      const rect = el.getBoundingClientRect();
                      const gap = 12;
                      const targetScrollY = window.scrollY + rect.bottom + gap - window.innerHeight;
                      window.scrollTo({ top: targetScrollY, behavior: "smooth" });
                    }, 0);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 active:scale-[0.99]"
                  style={{
                    background: isSelected
                      ? "var(--brand-blue-hex)"
                      : isFullyBooked
                        ? "var(--surface-secondary)"
                        : "var(--surface-elevated)",
                    opacity: pastDisabled ? 0.35 : 1,
                    pointerEvents: disabled ? "none" : "auto",
                    borderBottom: i < TIME_SLOTS.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  }}
                >
                  {/* Availability dot */}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: isSelected
                        ? "rgba(255,255,255,0.6)"
                        : pastDisabled
                          ? "var(--border-medium)"
                          : isFullyBooked
                            ? "#d1495b"
                            : isLimited
                              ? "#e07b4a"
                              : "#4caf7d",
                    }}
                  />
                  {/* Time label */}
                  <span
                    className="flex-1 text-left"
                    style={{
                      color: isSelected
                        ? "#ffffff"
                        : isFullyBooked
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                      textDecoration: isFullyBooked ? "line-through" : "none",
                    }}
                  >
                    {formatDisplayTime(slot)}
                  </span>
                  {/* Status badge */}
                  {isFullyBooked && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: "oklch(0.65 0.18 15 / 0.08)",
                        color: "#a83240",
                      }}
                    >
                      Fully booked
                    </span>
                  )}
                  {isLimited && !isSelected && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: "oklch(0.65 0.13 40 / 0.10)",
                        color: "#c45c1a",
                      }}
                    >
                      limited spots remain
                    </span>
                  )}
                  {isSelected && (
                    <span className="shrink-0 text-xs font-semibold text-white/70">
                      Selected
                    </span>
                  )}
                </button>
              );
            });
            })()}
          </div>
          </div>{/* end outer clip wrapper */}
        </div>
      )}

      {/* ── Office location — hidden on desktop (shown in sidebar) */}
      <div
        className="flex flex-col gap-3 pt-2 lg:hidden"
        style={{
          opacity: 0,
          animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 160ms both",
        }}
      >
        {/* Mobile: image on top, details below. sm+: side-by-side row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">

          {/* Landscape image — full width on mobile, fixed sidebar on sm+ */}
          <div className="flex flex-col gap-2 sm:shrink-0">
            <div className="relative h-44 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] sm:h-52 sm:w-52">
              <img
                src="/images/cf-money-shopfront.jpg"
                alt="CF Money office shopfront at 1 North Bridge Road"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "35% center", transform: "scale(1.35)", transformOrigin: "35% center" }}
                loading="lazy"
              />
            </div>
          </div>

          {/* Address + hours */}
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl whitespace-nowrap">
                Our office
              </h3>
            </div>

            <div className="flex items-start gap-3">
              <MapPin
                size={16}
                weight="duotone"
                className="mt-0.5 shrink-0 text-brand-blue"
              />
              <a
                href="https://maps.app.goo.gl/Cs9Av94qW3NHh7wY6"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col transition-opacity duration-200 hover:opacity-75"
              >
                <p className="text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-medium)] underline-offset-2 group-hover:decoration-brand-blue">
                  1 North Bridge Road, High Street Centre
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-medium)] underline-offset-2 group-hover:decoration-brand-blue">
                  #01-35, Singapore 179094
                </p>
              </a>
            </div>

            <div className="flex items-start gap-3">
              <Clock
                size={16}
                weight="duotone"
                className="mt-0.5 shrink-0 text-brand-blue"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Mon &ndash; Sat &nbsp;&middot;&nbsp; 10:30am &ndash; 7:30pm
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Closed on Sundays &amp; Public Holidays
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Train
                size={16}
                weight="duotone"
                className="mt-0.5 shrink-0 text-brand-blue"
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                City Hall MRT (Exit B) or Clarke Quay MRT (Exit E)
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Car
                size={16}
                weight="duotone"
                className="mt-0.5 shrink-0 text-brand-blue"
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Multi-storey carpark in the building
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm button ─────────────────────────────────────── */}
      <div
        ref={confirmBtnRef}
        style={{
          opacity: 0,
          animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 240ms both",
        }}
      >
        <button
          type="button"
          disabled={!canConfirm}
            onClick={() => {
            setConfirmed(true);
            window.scrollTo({ top: 0, behavior: "instant" });
            if (selectedDate && selectedTime) onConfirm?.(selectedDate, selectedTime);
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        >
          Confirm Appointment
          <ArrowRight size={16} weight="bold" />
        </button>
        {!canConfirm && (
          <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">
            {!selectedDate
              ? "Select a date to continue"
              : "Select a time to continue"}
          </p>
        )}
      </div>
    </div>
  );
}
