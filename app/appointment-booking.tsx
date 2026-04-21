"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  CalendarBlank,
  MapPin,
  Clock,
  ArrowSquareOut,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Train,
  Car,
  UserCircle,
  QrCode,
  ListNumbers,
} from "@phosphor-icons/react";

// Singapore 2026 public holidays (YYYY-MM-DD)
const SG_PUBLIC_HOLIDAYS_2026 = new Set([
  "2026-01-01", // New Year's Day
  "2026-01-29", // Chinese New Year
  "2026-01-30", // Chinese New Year (2nd day)
  "2026-04-03", // Good Friday
  "2026-05-01", // Labour Day
  "2026-05-12", // Vesak Day
  "2026-06-17", // Hari Raya Haji
  "2026-08-09", // National Day
  "2026-10-20", // Deepavali
  "2026-12-25", // Christmas Day
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
  return date.toISOString().slice(0, 10);
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
}

interface AppointmentBookingProps {
  formData: FormData;
  onBack?: () => void;
}

export function AppointmentBooking({ formData, onBack }: AppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const dateScrollRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScroll: number; pointerId: number; dragging: boolean } | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const updateFades = useCallback(() => {
    const el = dateScrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = dateScrollRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    return () => el.removeEventListener("scroll", updateFades);
  }, [updateFades]);

  const scrollDates = useCallback((direction: "left" | "right") => {
    const el = dateScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "right" ? 200 : -200, behavior: "smooth" });
  }, []);

  // Only capture the pointer (and suppress the click) once the drag crosses a
  // 6px threshold — short taps never trigger it so button clicks work normally.
  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dateScrollRef.current) return;
    dragState.current = {
      startX: e.clientX,
      startScroll: dateScrollRef.current.scrollLeft,
      pointerId: e.pointerId,
      dragging: false,
    };
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = dateScrollRef.current;
    if (!dragState.current || !el) return;
    const dx = e.clientX - dragState.current.startX;
    if (!dragState.current.dragging) {
      if (Math.abs(dx) < 6) return;
      dragState.current.dragging = true;
      el.setPointerCapture(dragState.current.pointerId);
    }
    el.scrollLeft = dragState.current.startScroll - dx;
  }, []);

  const onDragEnd = useCallback(() => {
    dragState.current = null;
  }, []);

  // Swallow the synthetic click that bubbles up after a completed drag.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragState.current?.dragging) e.stopPropagation();
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Generate the next 28 days as candidates
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [today]);

  // Current time for filtering past slots on today
  const nowHour = new Date().getHours();
  const nowMinute = new Date().getMinutes();

  const isSlotDisabled = (slot: string): boolean => {
    if (!selectedDate) return false;
    if (selectedDate !== toISODate(today)) return false;
    const [h, m] = slot.split(":").map(Number);
    // Disable if the slot start is in the past (with 30-min buffer)
    return h < nowHour || (h === nowHour && m <= nowMinute);
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
              {" — "}
              {formatDisplayTime(
                (() => {
                  const [h, m] = selectedTime.split(":").map(Number);
                  const end = new Date(2000, 0, 1, h, m + 30);
                  return `${end.getHours()}:${end.getMinutes().toString().padStart(2, "0")}`;
                })(),
              )}
            </p>
          </div>
        </div>

        {/* ── On the day instructions ─────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            When you arrive
          </p>
          <ol className="flex flex-col gap-4">
            {[
              {
                icon: UserCircle,
                text: "Sign in via Singpass at our counter, a QR code will be generated on your phone.",
              },
              {
                icon: QrCode,
                text: "Scan the QR code against our scanner at the main door to receive your queue number.",
              },
              {
                icon: ListNumbers,
                text: "Take a seat and wait for your queue number to be called.",
              },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "oklch(0.32 0.14 260 / 0.08)",
                    color: "var(--brand-blue-hex)",
                  }}
                >
                  <Icon size={15} weight="duotone" />
                </div>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Office details */}
        <div className="flex flex-col gap-4 text-left">
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
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Our office
              </h3>
              <a
                href="https://maps.app.goo.gl/Cs9Av94qW3NHh7wY6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-blue transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              >
                View on Google Maps
                <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>

            <div className="flex items-start gap-3">
              <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0 text-brand-blue" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  1 North Bridge Road, High Street Centre
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  #01-35, Singapore 179094
                </p>
              </div>
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
          <p>
            If you have any questions, call us at{" "}
            <a
              href="tel:+6567778080"
              className="font-medium text-brand-blue transition-colors duration-200 hover:brightness-110"
            >
              6777 8080
            </a>
            {" "}or{" "}
            <a
              href="https://wa.me/6560119380?text=I%20have%20a%20question%20about%20my%20appointment"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-blue transition-colors duration-200 hover:brightness-110"
            >
              WhatsApp us
            </a>
            .
          </p>
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
          Book your visit
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] max-w-[42ch] sm:max-w-none">
          Pick a date and time that works for you.<br />
          We&apos;re open Monday to Saturday, 10:30am&ndash;7:30pm.
        </p>
      </div>

      {/* ── Date picker ────────────────────────────────────────── */}
      <div
        style={{
          opacity: 0,
          animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 80ms both",
        }}
      >
        {/* Label row with scroll arrows */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-primary)]">Select a date</p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => scrollDates("left")}
              aria-label="Scroll dates left"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-secondary)] active:scale-[0.92]"
            >
              <ArrowLeft size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => scrollDates("right")}
              aria-label="Scroll dates right"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-secondary)] active:scale-[0.92]"
            >
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>
        {/* Scroll strip with fade edges */}
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--surface-primary)] to-transparent transition-opacity duration-200"
            style={{ opacity: showLeftFade ? 1 : 0 }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[var(--surface-primary)] to-transparent transition-opacity duration-200"
            style={{ opacity: showRightFade ? 1 : 0 }}
          />
        <div
          ref={dateScrollRef}
          className="date-scroll flex gap-2 pb-2"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onClickCapture={onClickCapture}
        >
          {availableDates.map((date, i) => {
            const iso = toISODate(date);
            const disabled = isDisabledDate(date);
            const isSelected = selectedDate === iso;
            const isToday = iso === toISODate(today);

            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedDate(iso);
                  setSelectedTime(null);
                }}
                className="flex shrink-0 flex-col items-center gap-1 rounded-[var(--radius-md)] border px-3 py-2.5 transition-all duration-200 active:scale-[0.96]"
                style={{
                  minWidth: 56,
                  borderColor: isSelected
                    ? "var(--brand-blue-hex)"
                    : "var(--border-subtle)",
                  background: isSelected
                    ? "var(--brand-blue-hex)"
                    : "transparent",
                  opacity: disabled ? 0.3 : 1,
                  pointerEvents: disabled ? "none" : "auto",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    color: isSelected
                      ? "var(--text-on-brand)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {DAY_LABELS[date.getDay()]}
                </span>
                <span
                  className="font-display text-lg font-bold leading-none tabular-nums"
                  style={{
                    color: isSelected
                      ? "var(--text-on-brand)"
                      : "var(--text-primary)",
                  }}
                >
                  {date.getDate()}
                </span>
                {(date.getDate() === 1 || i === 0) && (
                  <span
                    className="text-[9px] font-medium uppercase tracking-wider"
                    style={{
                      color: isSelected
                        ? "oklch(0.98 0.005 260 / 0.7)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {MONTH_LABELS[date.getMonth()]}
                  </span>
                )}
                {isToday && !isSelected && (
                  <div
                    className="h-1 w-1 rounded-full"
                    style={{ background: "var(--brand-teal-hex)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
        </div>{/* end gradient wrapper */}
      </div>

      {/* ── Time slots ─────────────────────────────────────────── */}
      {selectedDate && (
        <div
          className="animate-slide-in flex flex-col gap-3"
        >
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Select a time
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TIME_SLOTS.map((slot, i) => {
              const disabled = isSlotDisabled(slot);
              const isSelected = selectedTime === slot;

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
                      const gap = 12; // px of whitespace below the button
                      const targetScrollY = window.scrollY + rect.bottom + gap - window.innerHeight;
                      window.scrollTo({ top: targetScrollY, behavior: "smooth" });
                    }, 0);
                  }}
                  className="rounded-[var(--radius-md)] border py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.96]"
                  style={{
                    borderColor: isSelected
                      ? "var(--brand-blue-hex)"
                      : "var(--border-subtle)",
                    background: isSelected
                      ? "var(--brand-blue-hex)"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : "var(--text-secondary)",
                    opacity: disabled ? 0.3 : 1,
                    pointerEvents: disabled ? "none" : "auto",
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  {formatDisplayTime(slot)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Office location ────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 pt-2"
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
            <a
              href="https://maps.app.goo.gl/Cs9Av94qW3NHh7wY6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-brand-blue transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              View on Google Maps
              <ArrowSquareOut size={14} weight="bold" />
            </a>
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
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  1 North Bridge Road, High Street Centre
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  #01-35, Singapore 179094
                </p>
              </div>
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
