"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  ArrowSquareOut,
  CheckCircle,
  Train,
  Car,
  DownloadSimple,
  Copy,
  Check,
} from "@phosphor-icons/react";
import type { StoredBookingConfirmation } from "@/lib/booking-confirmation";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

type BringItem = { title: string; titleSuffix?: string; sub?: string; subItems?: string[] };

type BringGroup = {
  mustHave: BringItem[];
  goodToHave?: BringItem[];
};

/** Previous 3 full calendar months, e.g. "Apr, May & Jun". */
function lastThreeMonthsLabel(): string {
  const now = new Date();
  const months: string[] = [];
  for (let i = 3; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(MONTH_LABELS[d.getMonth()]);
  }
  return `${months[0]}, ${months[1]} & ${months[2]}`;
}

function getWhatToBring(): { sg_pr: BringGroup; foreigner: BringGroup } {
  const months = lastThreeMonthsLabel();
  return {
    sg_pr: {
      mustHave: [
        { title: "NRIC", sub: "Physical card or digital Singpass" },
        { title: "Singpass app", sub: "Installed on your phone" },
      ],
      goodToHave: [
        {
          title: "Last 3 months of income proof",
          titleSuffix: `(${months})`,
          subItems: [
            "Payslips",
            "PHV platform / gig worker statements",
            "Bank statements",
          ],
        },
      ],
    },
    foreigner: {
      mustHave: [
        { title: "Work Pass", sub: "WP / SP / EP / LTVP, 3+ months validity" },
        { title: "Singpass app", sub: "Installed on your phone" },
        { title: `Payslips (${months})`, sub: "Latest 3 months" },
        { title: "Proof of SG address", sub: "Bank / utility / mobile bill, dated within 30 days" },
      ],
    },
  };
}

function formatItemForShare(item: BringItem): string[] {
  const fullTitle = item.titleSuffix ? `${item.title} ${item.titleSuffix}` : item.title;
  if (item.subItems?.length) {
    return [fullTitle, ...item.subItems.map((s) => `  • ${s}`)];
  }
  return [`• ${fullTitle}${item.sub ? ` — ${item.sub}` : ""}`];
}

function formatThingsToBringForShare(idType: "sg_pr" | "foreigner"): string {
  const group = getWhatToBring()[idType];
  const lines: string[] = ["Must have:"];
  for (const item of group.mustHave) {
    lines.push(...formatItemForShare(item));
  }
  if (group.goodToHave?.length) {
    lines.push("", "Good to have (can help increase your loan amount):");
    for (const item of group.goodToHave) {
      lines.push(...formatItemForShare(item));
    }
  }
  return lines.join("\n");
}

function GlowingDot({ color }: { color: "green" | "blue" }) {
  const dotColor = color === "green" ? "#22c55e" : "var(--brand-blue-hex, #0033AA)";
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
      <span
        className="absolute inline-flex h-full w-full rounded-full animate-ping"
        style={{ background: dotColor, opacity: 0.55 }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{
          background: dotColor,
          boxShadow: color === "green"
            ? "0 0 8px #22c55e88"
            : "0 0 8px oklch(0.32 0.14 260 / 0.45)",
        }}
      />
    </span>
  );
}

function BringGroupSection({
  label,
  dotColor,
  headerSub,
  items,
}: {
  label: string;
  dotColor: "green" | "blue";
  headerSub?: string;
  items: BringItem[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <GlowingDot color={dotColor} />
          <span
            className="text-sm sm:text-xs font-bold tracking-[0.16em] uppercase"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
          </span>
        </div>
        {headerSub && (
          <p className="text-sm sm:text-xs leading-snug pl-4" style={{ color: "var(--text-tertiary)" }}>
            {headerSub}
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-3 pl-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-2.5">
            <CheckCircle
              size={18}
              weight="duotone"
              className="mt-0.5 shrink-0 text-brand-teal"
            />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-base sm:text-sm font-semibold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {item.title}
                {item.titleSuffix && (
                  <>
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline"> </span>
                    {item.titleSuffix}
                  </>
                )}
              </span>
              {item.subItems ? (
                <ul className="flex flex-col gap-0.5 mt-0.5">
                  {item.subItems.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-1.5 text-sm sm:text-xs leading-relaxed"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-[var(--text-tertiary)] opacity-60" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : item.sub ? (
                <span
                  className="text-sm sm:text-xs leading-relaxed"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {item.sub}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhatToBring({ idType }: { idType: string }) {
  const defaultTab = idType === "foreigner" ? "foreigner" : "sg_pr";
  const [tab, setTab] = useState<"sg_pr" | "foreigner">(defaultTab as "sg_pr" | "foreigner");
  const group = getWhatToBring()[tab];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-5 text-left">
      <p className="text-base sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
        Things to bring
      </p>

      <div className="flex gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-1 w-fit">
        {(["sg_pr", "foreigner"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="rounded-full px-4 py-1.5 text-base sm:text-sm font-semibold transition-all duration-200"
            style={{
              background: tab === t ? "var(--brand-teal-hex)" : "var(--surface-elevated)",
              color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: tab === t ? "none" : "0 0 0 1px var(--border-subtle)",
            }}
          >
            {t === "sg_pr" ? "Singaporean / PR" : "Foreigner"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <BringGroupSection
          label="Must have"
          dotColor="green"
          items={group.mustHave}
        />
        {group.goodToHave && group.goodToHave.length > 0 && (
          <BringGroupSection
            label="Good to have"
            dotColor="blue"
            headerSub="Can help increase your loan amount"
            items={group.goodToHave}
          />
        )}
      </div>
    </div>
  );
}

interface BookingConfirmedViewProps {
  booking: StoredBookingConfirmation;
}

export function BookingConfirmedView({ booking }: BookingConfirmedViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(booking.cfh5Id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const idType = booking.idType === "foreigner" ? "foreigner" : "sg_pr";

  const thingsToBringLines = formatThingsToBringForShare(idType);

  const appointmentMessage = [
    "[ CF Money Appointment ]",
    "",
    `Application Ref: ${booking.cfh5Id}`,
    "",
    `Date: ${formatDisplayDate(booking.date)}`,
    `Time: ${formatDisplayTime(booking.time)}`,
    "",
    "-- Location --",
    "1 North Bridge Road, High Street Centre",
    "#01-35, Singapore 179094",
    "City Hall MRT (Exit B) or Clarke Quay MRT (Exit E)",
    "https://maps.app.goo.gl/Cs9Av94qW3NHh7wY6",
    "",
    "-- Things to bring --",
    thingsToBringLines,
  ].join("\n");

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text: appointmentMessage }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(appointmentMessage)}`, "_blank");
    }
  };


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
            Kindly arrive on time so we can serve you promptly.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            <DownloadSimple size={16} weight="bold" />
            Save Details on WhatsApp
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-4 text-left">
        <p className="text-xs text-[var(--text-tertiary)]">Application reference</p>
        <div className="mt-0.5 flex items-center gap-2.5">
          <p className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {booking.cfh5Id}
          </p>
          <button
            type="button"
            onClick={handleCopyRef}
            aria-label="Copy reference number"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded transition-opacity duration-150 hover:opacity-60 active:scale-95"
          >
            {copied
              ? <Check size={20} weight="bold" style={{ color: "var(--text-primary)" }} />
              : <Copy size={20} weight="regular" style={{ color: "var(--text-primary)" }} />
            }
          </button>
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

      <div className="pb-1" />
    </div>
  );
}
