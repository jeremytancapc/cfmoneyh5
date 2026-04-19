"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree,
  Ticket,
  Door,
  CurrencyDollar,
  type Icon,
} from "@phosphor-icons/react";
import { QueueUploadCard } from "./queue-upload-card";

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

const STAGE_META: Record<Stage, { label: string; queueLabel: string; number: number; Icon: Icon; StageIcon: Icon }> = {
  counter: { label: "Counter", queueLabel: "Counter Queue", number: 1, Icon: NumberCircleOne,   StageIcon: Ticket         },
  room:    { label: "Room",    queueLabel: "Room Queue",    number: 2, Icon: NumberCircleTwo,    StageIcon: Door           },
  cash:    { label: "Cash",    queueLabel: "Cash Queue",    number: 3, Icon: NumberCircleThree,  StageIcon: CurrencyDollar },
};

const STATUS_GLOW: Partial<Record<QueueStatusVariant, string>> = {
  waiting:       "#FCD34D",
  "in-progress": "#16a34a",
  "your-turn":   "#06DEC0",
  missed:        "oklch(0.78 0.18 55)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split "Room 1" → { text: "Room", num: "1" }, graceful fallback */
function splitLocation(loc: string): { text: string; num: string } {
  const match = /^(.*?)(\d+)\s*$/.exec(loc.trim());
  if (match) return { text: match[1].trim(), num: match[2] };
  return { text: loc, num: "" };
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Singpass modal ───────────────────────────────────────────────────────────

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
  const stageMeta = STAGE_META[stage];
  const isMissed  = status === "missed";
  const isYourTurn = status === "your-turn";
  const isInProgress = status === "in-progress";
  const isWaiting = status === "waiting";
  const loc = location ? splitLocation(location) : null;

  const [qrState, setQrState] = useState<"idle" | "active" | "expired">("idle");
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

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

  const handleGenerateQr = useCallback(() => {
    setQrExpiresAt(Date.now() + 15 * 1000);
    setQrState("active");
  }, []);

  const STAGE_ORDER: Stage[] = ["counter", "room", "cash"];
  const STAGE_SHORT: Record<Stage, string> = { counter: "Counter", room: "Room", cash: "Cash" };
  const STAGE_NUM: Record<Stage, string>   = { counter: "01",      room: "02",   cash: "03"   };
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const prevStage  = currentIdx > 0                        ? STAGE_ORDER[currentIdx - 1] : null;
  const nextStage  = currentIdx < STAGE_ORDER.length - 1  ? STAGE_ORDER[currentIdx + 1] : null;

  const hasLowerPanel = stage === "counter" || isMissed || (isYourTurn && !!loc && stage !== "cash");

  return (
    <div className={`animate-fade-up flex flex-col${hasLowerPanel ? "" : " -mb-8 sm:-mb-8 lg:-mb-10"}`}>

      {/* ═══════════════════════════════════════════════════════════════
          Blue hero
          Mobile: bleeds to viewport edges via negative margins
          lg+: contained block with rounded top corners
      ════════════════════════════════════════════════════════════════ */}
      <section
        className={`relative -mx-5 mt-0 sm:-mx-8 lg:mx-0 lg:mt-0 overflow-hidden${hasLowerPanel ? " lg:rounded-t-[var(--radius-lg)]" : " lg:rounded-[var(--radius-lg)]"}`}
        style={{ backgroundColor: "#0033AA" }}
      >
        {/* ── Address / meta block ─────────────────────────────────── */}
        <div className="px-6 pt-7 sm:px-8 sm:pt-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/50">
            Welcome
          </p>
          <p className="mt-0.5 font-display text-[15px] font-bold uppercase tracking-[0.08em] text-white leading-tight">
            {customerName}
          </p>

          <div className="mt-4 flex flex-col gap-0.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/50">
              Stage {String(stageMeta.number).padStart(2, "0")} / 03
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
              {stageMeta.queueLabel}
            </p>
          </div>
        </div>

        {/* ── Cards area — 3-col grid: prev stage | big card | next stage ── */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-3 pt-8 sm:gap-3 sm:px-7">

          {/* Left: previous (completed) stage chip */}
          <div className="flex justify-end">
            {prevStage ? (() => {
              const SI = STAGE_META[prevStage].StageIcon;
              return (
                <div className="flex flex-col items-center">
                  <SI size={24} weight="duotone" className="relative z-10 mb-1.5 text-white/35" />
                  <div className="rounded-[var(--radius-sm)] bg-white px-3 py-2.5 text-center shadow-lg min-w-[52px]">
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                      {STAGE_NUM[prevStage]}
                    </p>
                    <p className="font-display text-[13px] font-black leading-none text-[var(--text-primary)] mt-0.5">
                      {STAGE_SHORT[prevStage]}
                    </p>
                    <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.15em]" style={{ color: "oklch(0.52 0.18 155)" }}>
                      Done
                    </p>
                  </div>
                </div>
              );
            })() : <div />}
          </div>

          {/* Center: large black number card */}
          <div className="flex flex-col items-center">
            <stageMeta.StageIcon size={42} weight="duotone" className="relative z-10 mb-2 text-white" />

            <div
              className={`relative rounded-[var(--radius-md)] bg-[#111111] text-white px-5 pt-6 pb-4 sm:px-7 text-center shadow-2xl min-w-[140px] sm:min-w-[160px] flex flex-col items-center justify-center${STATUS_GLOW[status] ? " queue-card-glow" : ""}`}
              style={STATUS_GLOW[status] ? ({ ["--glow-color" as string]: STATUS_GLOW[status] }) : undefined}
            >

              {/* ── waiting ── */}
              {isWaiting && (
                <>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    You&rsquo;re Number
                  </p>
                  <p className="font-display text-[56px] sm:text-[72px] font-black leading-none mt-2 tracking-tight">
                    {queueNumber}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: "#FCD34D",
                        boxShadow: "0 0 8px 2px rgba(252,211,77,0.5)",
                      }}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">
                      Waiting
                    </span>
                  </div>
                </>
              )}

              {/* ── in-progress ── */}
              {isInProgress && (
                <>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    In Service
                  </p>
                  <p className="font-display text-[56px] sm:text-[72px] font-black leading-none mt-2 tracking-tight">
                    {queueNumber}
                  </p>
                  {loc && (
                    <>
                      <div className="mt-4 h-px w-8 mx-auto bg-white/20" />
                      <p className="mt-3.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/50">
                        {loc.text || stageMeta.label}
                      </p>
                      {loc.num && (
                        <p className="font-display text-xl font-bold mt-0.5 text-white/85">
                          {loc.num}
                        </p>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── your-turn ── */}
              {isYourTurn && (
                <>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    Your Number Is Up!
                  </p>
                  {loc ? (
                    <>
                      <p className="font-display text-base font-bold uppercase tracking-[0.12em] mt-3 text-white/80">
                        {loc.text || stageMeta.label}
                      </p>
                      <p className="font-display text-[52px] sm:text-[64px] font-black leading-none mt-1 tracking-tight">
                        {loc.num || queueNumber}
                      </p>
                    </>
                  ) : (
                    <p className="font-display text-[56px] sm:text-[72px] font-black leading-none mt-2 tracking-tight">
                      {queueNumber}
                    </p>
                  )}
                  {/* Teal pulse dot */}
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: "#06DEC0",
                        boxShadow: "0 0 8px 2px rgba(6,222,192,0.45)",
                      }}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">
                      Ready
                    </span>
                  </div>
                </>
              )}

              {/* ── missed ── */}
              {isMissed && (
                <>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    Queue Status
                  </p>
                  <p
                    className="font-display text-4xl font-black leading-none mt-3 tracking-tight"
                    style={{ color: "oklch(0.78 0.18 55)" }}
                  >
                    Missed
                  </p>
                  <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Rescan to rejoin
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right: next (upcoming) stage chip */}
          <div className="flex justify-start">
            {nextStage ? (() => {
              const SI = STAGE_META[nextStage].StageIcon;
              return (
                <div className="flex flex-col items-center">
                  <SI size={24} weight="duotone" className="relative z-10 mb-1.5 text-white/25" />
                  <div className="rounded-[var(--radius-sm)] bg-white/70 px-3 py-2.5 text-center shadow-lg min-w-[52px]">
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                      {STAGE_NUM[nextStage]}
                    </p>
                    <p className="font-display text-[13px] font-black leading-none text-[var(--text-secondary)] mt-0.5">
                      {STAGE_SHORT[nextStage]}
                    </p>
                    <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                      Next
                    </p>
                  </div>
                </div>
              );
            })() : <div />}
          </div>
        </div>

        {/* ── Status footer inside hero ───────────────────────────── */}
        <div className="relative z-20 mt-8 px-6 pb-4 text-center sm:px-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white">
            {isWaiting && "Thank you for waiting · We will notify you"}
            {isInProgress && "Service in progress"}
            {isYourTurn && `Please proceed to your assigned ${stage === "room" ? "room" : "counter"}`}
            {isMissed && "You've missed your turn!"}
          </p>
        </div>

        {/* ── Tick ruler decoration ────────────────────────────────── */}
        <div
          aria-hidden
          className="h-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(255,255,255,0.3) 0 1px, transparent 1px 10px)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
          }}
        />

        {showSingpassModal && <SingpassModal />}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          White lower panel — always shown for counter; shown for other
          stages only when there is actionable content (missed QR or
          your-turn location row).
      ════════════════════════════════════════════════════════════════ */}
      {(stage === "counter" || isMissed || (isYourTurn && !!loc && stage !== "cash")) && (
        <div className={`-mx-5 sm:-mx-8 lg:mx-0 lg:rounded-b-[var(--radius-lg)] border-x border-[var(--border-subtle)] bg-white px-5 pt-7 pb-8 sm:px-8${isMissed ? "" : " border-b"}`}>

          {/* QR rescan block — missed status only */}
          {isMissed && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                  Rescan to Rejoin
                </p>
                <p className="mt-1.5 font-display text-base font-bold text-[var(--text-primary)]">
                  Scan the QR code below
                </p>
                {qrState === "idle" && (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {"Only click "}
                    <strong className="font-semibold text-[var(--text-primary)]">Rejoin Queue</strong>
                    {" below once you're ready to get back in line."}
                  </p>
                )}
                {qrState === "active" && (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    <strong className="font-semibold text-[var(--text-primary)]">Scan this QR Code</strong> at the entrance scanner to rejoin the queue.
                  </p>
                )}
                {qrState === "expired" && (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {"Your QR code has expired. Generate a new one when you're ready."}
                  </p>
                )}
              </div>

              {/* QR image — blurred until active */}
              <div className="relative rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
                <img
                  src="/images/qr-placeholder.png"
                  alt="Rejoin queue QR code"
                  width={150}
                  height={150}
                  className="block transition-all duration-300"
                  style={{
                    imageRendering: "pixelated",
                    filter: qrState === "active" ? "none" : "blur(6px) grayscale(0.4)",
                  }}
                />

                {qrState === "idle" && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)]">
                    <button
                      type="button"
                      onClick={handleGenerateQr}
                      className="flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                    >
                      Rejoin Queue
                    </button>
                  </div>
                )}

                {qrState === "expired" && (
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

              {/* Countdown while active */}
              {qrState === "active" && (
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

              {/* Re-generate button when expired */}
              {qrState === "expired" && (
                <button
                  type="button"
                  onClick={handleGenerateQr}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                >
                  Rejoin Queue
                </button>
              )}

            </div>
          )}

          {/* Your-turn: location confirmation row */}
          {isYourTurn && loc && (
            <div className="mb-6 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                  Proceed to
                </p>
                <p className="mt-0.5 font-display text-base font-bold text-[var(--text-primary)]">
                  {location}
                </p>
              </div>
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: "#06DEC0",
                  boxShadow: "0 0 8px 2px rgba(6,222,192,0.35)",
                }}
              />
            </div>
          )}

          {/* Upload card — counter stage only */}
          {stage === "counter" && <QueueUploadCard />}
        </div>
      )}
    </div>
  );
}
