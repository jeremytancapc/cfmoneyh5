"use client";

import { useEffect, useRef, useState } from "react";
import { CircleLoader } from "@/components/ui/circle-loader";

const STATUS_MESSAGES = [
  "Analyzing your profile...",
  "Checking eligibility...",
  "Calculating your offer...",
  "Almost there...",
];

interface LoanLoadingScreenProps {
  onComplete: () => void;
}

export function LoanLoadingScreen({ onComplete }: LoanLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [statusVisible, setStatusVisible] = useState(true);

  // Keep a stable ref to onComplete so the effect never needs to re-run
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let current = 0;
    let done = false;

    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    // Irregular progress ticks — staggered, not smooth (~9 s total)
    const ticks: [number, number][] = [
      [400,   7],
      [900,   9],
      [1500,  5],
      [2200, 11],
      [2900,  6],
      [3700,  8],  // deliberate pause here — feels like a real check
      [4600, 10],
      [5400,  7],
      [6200, 12],
      [7000,  8],
      [7800,  9],
      [8500,  8],
    ];

    ticks.forEach(([delay, inc]) => {
      t(() => {
        if (done) return;
        current = Math.min(100, current + inc);
        setProgress(current);
        if (current >= 100 && !done) {
          done = true;
          t(() => onCompleteRef.current(), 600);
        }
      }, delay);
    });

    // Status message cycling — spread across the full duration
    const cycle = (idx: number, at: number) => {
      if (idx >= STATUS_MESSAGES.length) return;
      t(() => {
        setStatusVisible(false);
        t(() => {
          setStatusIndex(idx);
          setStatusVisible(true);
          cycle(idx + 1, at + 2200);
        }, 250);
      }, at);
    };
    cycle(1, 2000);

    return () => {
      done = true;
      timers.forEach(clearTimeout);
    };
  }, []); // intentionally empty — screen mounts once and transitions away

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">

      {/* ── Background ghost content (behind the frosted layer) ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-8"
        aria-hidden="true"
      >
        {/* Ghost: large dollar figure */}
        <div
          className="animate-blur-reveal flex flex-col gap-3"
          style={{ animationDelay: "0.8s" }}
        >
          <div
            className="h-3 w-24 rounded-full"
            style={{ background: "var(--border-subtle)" }}
          />
          <div
            className="h-14 w-56 rounded-xl"
            style={{ background: "var(--border-subtle)" }}
          />
        </div>

        {/* Ghost: three summary stats */}
        <div
          className="animate-blur-reveal flex gap-8"
          style={{ animationDelay: "2.0s" }}
        >
          {[56, 72, 56].map((w, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div
                className="h-2 rounded-full"
                style={{ width: w, background: "var(--border-subtle)" }}
              />
              <div
                className="h-5 rounded"
                style={{ width: w - 8, background: "var(--border-medium)" }}
              />
            </div>
          ))}
        </div>

        {/* Ghost: document lines */}
        <div
          className="animate-blur-reveal flex flex-col gap-2.5"
          style={{ animationDelay: "3.2s" }}
        >
          {[200, 160, 180, 130].map((w, i) => (
            <div
              key={i}
              className="h-2 rounded-full"
              style={{ width: w, background: "var(--border-subtle)" }}
            />
          ))}
        </div>
      </div>

      {/* ── Frosted overlay — light, see-through enough to notice background ── */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          background: "oklch(0.985 0.003 260 / 0.72)",
        }}
      />

      {/* ── Loader content — left-of-center on desktop ── */}
      <div className="relative z-10 flex w-full max-w-[380px] flex-col gap-8 px-8 lg:ml-[-8%]">

        {/* Circle loader */}
        <CircleLoader size={56} />

        {/* Status text */}
        <div>
          <p
            className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl"
            style={{
              opacity: statusVisible ? 1 : 0,
              transform: statusVisible ? "translateY(0)" : "translateY(-6px)",
              transition:
                "opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {STATUS_MESSAGES[statusIndex]}
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This usually takes a few seconds.
          </p>
        </div>

        {/* Staggered progress bar — scaleX transform, GPU composited */}
        <div className="flex flex-col gap-2.5">
          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ background: "var(--border-subtle)" }}
          >
            <div
              className="h-full origin-left rounded-full"
              style={{
                background: "var(--brand-teal-hex)",
                transform: `scaleX(${progress / 100})`,
                transition:
                  progress === 0
                    ? "none"
                    : "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
          <p
            className="text-sm font-medium tabular-nums text-[var(--text-tertiary)]"
            aria-live="polite"
          >
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );
}
