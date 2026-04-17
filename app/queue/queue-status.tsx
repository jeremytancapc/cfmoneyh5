"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Headphones,
  Bell,
  Warning,
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree,
  type Icon,
} from "@phosphor-icons/react";
import { QueueUploadCard } from "./queue-upload-card";

type QrState = "idle" | "active" | "expired";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type Stage = "counter" | "room" | "cash";
export type QueueStatusVariant = "waiting" | "in-progress" | "your-turn" | "missed";

export interface QueueStatusProps {
  stage: Stage;
  status: QueueStatusVariant;
  customerName: string;
  queueNumber: string;
  /** e.g. "Counter 6" | "Room 2" | "Counter 3" */
  location?: string;
  showSingpassModal?: boolean;
}

// ─── Stage metadata ──────────────────────────────────────────────────────────

const STAGE_META: Record<Stage, { label: string; number: number; Icon: Icon }> = {
  counter: { label: "Counter", number: 1, Icon: NumberCircleOne },
  room: { label: "Room", number: 2, Icon: NumberCircleTwo },
  cash: { label: "Cash Disbursement", number: 3, Icon: NumberCircleThree },
};

// ─── Status color tokens (oklch) ─────────────────────────────────────────────

const STATUS_TOKENS = {
  "waiting": {
    chipBg: "oklch(0.94 0.04 260)",
    chipText: "#0033AA",
    pillBg: "oklch(0.94 0.04 260)",
    pillText: "#0033AA",
    footerText: "#0033AA",
    boxBorder: "oklch(0.88 0.04 260)",
    boxBg: "oklch(0.97 0.015 260)",
  },
  "in-progress": {
    chipBg: "oklch(0.96 0.07 75)",
    chipText: "oklch(0.45 0.18 55)",
    pillBg: "oklch(0.55 0.18 55)",
    pillText: "#ffffff",
    footerText: "oklch(0.45 0.18 55)",
    boxBorder: "oklch(0.85 0.09 75)",
    boxBg: "oklch(0.98 0.04 75)",
  },
  "your-turn": {
    chipBg: "oklch(0.94 0.08 155)",
    chipText: "oklch(0.32 0.14 155)",
    pillBg: "oklch(0.38 0.16 155)",
    pillText: "#ffffff",
    footerText: "oklch(0.38 0.16 155)",
    boxBorder: "oklch(0.82 0.10 155)",
    boxBg: "oklch(0.97 0.04 155)",
  },
  "missed": {
    chipBg: "transparent",
    chipText: "transparent",
    pillBg: "oklch(0.95 0.04 20)",
    pillText: "oklch(0.48 0.22 25)",
    footerText: "oklch(0.48 0.22 25)",
    boxBorder: "oklch(0.88 0.06 20)",
    boxBg: "oklch(0.98 0.02 20)",
  },
};

// ─── Singpass Modal ───────────────────────────────────────────────────────────

function SingpassModal() {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[var(--radius-lg)] px-6"
      style={{ background: "oklch(0.10 0.02 260 / 0.45)" }}
    >
      <div className="w-full max-w-[340px] rounded-[var(--radius-lg)] bg-white px-7 py-8 shadow-2xl flex flex-col items-center gap-5">
        <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)]">
          Select{" "}
          <strong className="font-semibold text-[var(--text-primary)]">
            &lsquo;Sign with Singpass&rsquo;
          </strong>{" "}
          to complete the signing process.
        </p>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] px-5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
          style={{ background: "#E6002D" }}
        >
          <Image
            src="/images/singpass_logo_white-1.png"
            alt="Singpass"
            width={80}
            height={24}
            className="h-5 w-auto"
          />
          <span>Sign with Singpass</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QueueStatus({
  stage,
  status,
  customerName,
  queueNumber,
  location,
  showSingpassModal = false,
}: QueueStatusProps) {
  const tokens = STATUS_TOKENS[status];
  const stageMeta = STAGE_META[stage];
  const StageIcon = stageMeta.Icon;
  const isMissed = status === "missed";

  const [qrState, setQrState] = useState<QrState>("idle");
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const handleGenerateQr = useCallback(() => {
    setQrExpiresAt(Date.now() + 15 * 1000);
    setQrState("active");
  }, []);

  useEffect(() => {
    if (qrExpiresAt === null) return;
    const tick = () => {
      const secs = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      setRemainingSeconds(secs);
      if (secs === 0) setQrState("expired");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [qrExpiresAt]);

  return (
    <div className="animate-fade-up flex flex-col gap-8 text-center sm:text-left">
      {/* ── Customer name + stage pill ───────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Hello, {customerName}
          </p>
          {/* Stage pill */}
          <div className="mt-2 flex justify-center sm:justify-start">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "oklch(0.32 0.14 260 / 0.07)",
                color: "#0033AA",
              }}
            >
              <StageIcon size={14} weight="bold" />
              Stage {stageMeta.number} of 3 &middot; {stageMeta.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Queue status card ──────────────────────────────────────────── */}
      <div className="relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white">
        {/* Card header — blue gradient */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            background: "linear-gradient(135deg, #0033AA 0%, #0055CC 100%)",
          }}
        >
          {/* Green status dot — hidden on missed */}
          <div
            className="h-3 w-3 rounded-full transition-opacity duration-300"
            style={{
              background: isMissed ? "transparent" : "#22c55e",
              boxShadow: isMissed
                ? "none"
                : "0 0 0 3px oklch(0.60 0.20 145 / 0.35)",
            }}
          />
          <p className="font-display text-base font-bold text-white">
            Queue Status
          </p>
          <div
            className="h-3 w-3 rounded-full transition-opacity duration-300"
            style={{
              background: isMissed ? "transparent" : "#22c55e",
              boxShadow: isMissed
                ? "none"
                : "0 0 0 3px oklch(0.60 0.20 145 / 0.35)",
            }}
          />
        </div>

        {/* Card body */}
        <div className="flex flex-col items-center gap-5 px-5 py-7 text-center">
          {/* QR code section */}
          <div className="flex flex-col items-center gap-3 w-full">
            <div>
              <p className="font-display text-base font-bold tracking-tight text-[var(--text-primary)]">
                {isMissed ? "Rescan QR Code" : "Check-in QR Code"}
              </p>
              {!isMissed && (
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {qrState === "idle" && (
                    <>Only click <strong className="font-semibold text-[var(--text-primary)]">Show QR Code</strong> once you have arrived at our office.</>
                  )}
                  {qrState === "active" && (
                    <><strong className="font-semibold text-[var(--text-primary)]">Scan this QR Code</strong> at our entrance scanner to generate your queue number.</>
                  )}
                  {qrState === "expired" && "Your QR code has expired. Generate a new one when you\u2019re ready to check in."}
                </p>
              )}
              {isMissed && (
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Rescan to rejoin the queue.
                </p>
              )}
            </div>

            {/* QR image */}
            <div className="relative rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
              <img
                src="/images/qr-placeholder.png"
                alt="Check-in QR code"
                width={150}
                height={150}
                className="block transition-all duration-300"
                style={{
                  imageRendering: "pixelated",
                  filter: (isMissed || qrState === "active") ? "none" : "blur(6px) grayscale(0.4)",
                }}
              />

              {/* Idle overlay — "Show QR Code" button */}
              {!isMissed && qrState === "idle" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)]">
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    className="flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                  >
                    Show QR Code
                  </button>
                </div>
              )}

              {/* Expired overlay — EXPIRED stamp */}
              {!isMissed && qrState === "expired" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)]">
                  <span
                    className="select-none font-display text-2xl font-black uppercase tracking-widest"
                    style={{
                      color: "oklch(0.50 0.22 25)",
                      border: "3px solid oklch(0.50 0.22 25)",
                      padding: "4px 10px",
                      borderRadius: 4,
                      opacity: 0.85,
                      transform: "rotate(-12deg)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    EXPIRED
                  </span>
                </div>
              )}
            </div>

            {/* Countdown timer when active */}
            {!isMissed && qrState === "active" && (
              <div
                className="flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] border px-4 py-2.5 transition-colors duration-500"
                style={{
                  borderColor: remainingSeconds <= 5 ? "oklch(0.75 0.15 55)" : "var(--border-subtle)",
                  background: remainingSeconds <= 5 ? "oklch(0.98 0.04 75)" : "transparent",
                }}
              >
                <span
                  className="font-display text-2xl font-bold tabular-nums tracking-tight transition-colors duration-500"
                  style={{ color: remainingSeconds <= 5 ? "oklch(0.55 0.18 45)" : "var(--text-primary)" }}
                >
                  {formatCountdown(remainingSeconds)}
                </span>
                <span
                  className="text-xs font-medium transition-colors duration-500"
                  style={{ color: remainingSeconds <= 5 ? "oklch(0.60 0.16 45)" : "var(--text-tertiary)" }}
                >
                  {remainingSeconds <= 5 ? "Expiring soon" : "Time remaining"}
                </span>
              </div>
            )}

            {/* Regenerate button when expired */}
            {!isMissed && qrState === "expired" && (
              <button
                type="button"
                onClick={handleGenerateQr}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              >
                Show QR Code
              </button>
            )}

          </div>

          {/* Status action box */}
          {status === "waiting" && (
            <div className="flex w-full flex-col gap-4">
              <div
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] py-3.5"
                style={{
                  background: tokens.pillBg,
                  border: `1px solid ${tokens.boxBorder}`,
                }}
              >
                <Clock size={16} weight="duotone" style={{ color: tokens.pillText }} />
                <span className="text-sm font-semibold" style={{ color: tokens.pillText }}>
                  Waiting
                </span>
              </div>

              <div
                className="h-px w-full"
                style={{ background: "var(--border-subtle)" }}
              />

              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Queue Position
                </p>
                <p
                  className="font-display text-xl font-bold"
                  style={{ color: tokens.chipText }}
                >
                  Next in Line
                </p>
              </div>
            </div>
          )}

          {(status === "in-progress" || status === "your-turn") && location && (
            <div
              className="flex w-full flex-col items-center gap-2 rounded-[var(--radius-md)] border px-5 py-4"
              style={{
                background: tokens.boxBg,
                borderColor: tokens.boxBorder,
              }}
            >
              <div className="flex items-center gap-2">
                {status === "in-progress" ? (
                  <Headphones size={15} weight="duotone" style={{ color: tokens.footerText }} />
                ) : (
                  <Bell size={15} weight="duotone" style={{ color: tokens.footerText }} />
                )}
                <span
                  className="text-sm font-bold"
                  style={{ color: tokens.footerText }}
                >
                  {status === "in-progress" ? "In Progress" : "Your Turn"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {status === "in-progress" ? "Currently at" : "Kindly proceed to"}
              </p>
              <span
                className="rounded-full px-5 py-1.5 text-sm font-bold"
                style={{
                  background: tokens.pillBg,
                  color: tokens.pillText,
                }}
              >
                {location}
              </span>
            </div>
          )}

          {isMissed && (
            <div
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] py-3.5"
              style={{
                background: tokens.pillBg,
                border: `1px solid ${tokens.boxBorder}`,
              }}
            >
              <Warning size={16} weight="duotone" style={{ color: tokens.pillText }} />
              <span className="text-sm font-semibold" style={{ color: tokens.pillText }}>
                Missed
              </span>
            </div>
          )}
        </div>

        {/* Footer message */}
        <div
          className="px-5 py-3.5 text-center text-xs font-medium leading-relaxed"
          style={{
            background: (() => {
              if (status === "waiting") return "oklch(0.96 0.02 260)";
              if (status === "in-progress") return "oklch(0.98 0.04 75)";
              if (status === "your-turn") return "oklch(0.96 0.04 155)";
              return "oklch(0.98 0.02 20)";
            })(),
            color: tokens.footerText,
            borderTop: `1px solid ${tokens.boxBorder}`,
          }}
        >
          {status === "waiting" &&
            "Thank you for waiting. We will notify you when it\u2019s your turn."}
          {status === "in-progress" && "Service in progress. Thank you for your patience"}
          {status === "your-turn" && "Please proceed to your assigned location."}
          {isMissed &&
            "You\u2019ve missed your turn. Kindly rescan the QR code above to get back in line."}
        </div>

        {/* Singpass modal overlay */}
        {showSingpassModal && <SingpassModal />}
      </div>

      {/* ── Document upload card ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white px-6 py-6">
        <QueueUploadCard />
      </div>
    </div>
  );
}
