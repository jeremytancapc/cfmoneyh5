"use client";

import { useState } from "react";
import {
  CalendarBlank,
  MapPin,
  Clock,
  ArrowSquareOut,
  CheckCircle,
  Train,
  Car,
} from "@phosphor-icons/react";
import type { StoredBookingConfirmation } from "@/lib/booking-confirmation";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

function formatDisplayDate(isoDate: string): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return `${DAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDisplayTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

function WhatToBring({ idType }: { idType: string }) {
  const defaultTab = idType === "foreigner" ? "foreigner" : "sg_pr";
  const [tab, setTab] = useState<"sg_pr" | "foreigner">(defaultTab as "sg_pr" | "foreigner");
  const items = WHAT_TO_BRING[tab];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-5 text-left">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
        Things to bring
      </p>

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

interface BookingConfirmedViewProps {
  booking: StoredBookingConfirmation;
}

export function BookingConfirmedView({ booking }: BookingConfirmedViewProps) {
  const idType = booking.idType === "foreigner" ? "foreigner" : "sg_pr";

  return (
    <div className="animate-fade-up flex flex-col gap-8 pt-6 text-center sm:pt-0 sm:text-left">
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
            {formatDisplayDate(booking.date)}
          </p>
          <p className="mt-1 text-lg font-semibold text-brand-blue">
            {formatDisplayTime(booking.time)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            We recommend arriving 15 mins before your timeslot so that we can facilitate your appointment on time.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-4 text-left">
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">Application reference</p>
          <p className="mt-0.5 font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {booking.cfh5Id}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal/10">
          <CalendarBlank size={18} weight="duotone" className="text-brand-blue" />
        </div>
      </div>

      <WhatToBring idType={idType} />

      <div className="flex flex-col gap-4 text-left">
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
        <p className="text-xs text-[var(--text-tertiary)]">
          You can bookmark or refresh this page — your appointment details stay here for 30 days.
        </p>
      </div>
    </div>
  );
}
