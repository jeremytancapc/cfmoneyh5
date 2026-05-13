"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleLoader } from "@/components/ui/circle-loader";

const STATUS_MESSAGES = [
  "Analyzing your profile...",
  "Checking eligibility...",
  "Calculating your offer...",
  "Almost there...",
];

interface LoanLoadingScreenProps {
  onComplete: () => void;
  /**
   * When set, `onComplete` runs only after both the progress animation has
   * reached 100% and this promise has settled (success or failure).
   */
  waitUntil?: Promise<unknown>;
}

export function LoanLoadingScreen({ onComplete, waitUntil }: LoanLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [statusVisible, setStatusVisible] = useState(true);
  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);
  }, []);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let current = 0;
    let done = false;
    let released = !waitUntil;

    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    const clearAll = () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
    };

    const tryFinish = () => {
      if (done) return;
      if (current >= 100 && released) {
        done = true;
        clearAll();
        t(() => onCompleteRef.current(), 600);
      }
    };

    if (waitUntil) {
      void Promise.resolve(waitUntil).finally(() => {
        released = true;
        if (current < 100) {
          current = 100;
          setProgress(100);
        }
        tryFinish();
      });
    }

    const ticks: [number, number][] = [
      [400, 7],
      [900, 9],
      [1500, 5],
      [2200, 11],
      [2900, 6],
      [3700, 8],
      [4600, 10],
      [5400, 7],
      [6200, 12],
      [7000, 8],
      [7800, 9],
      [8500, 8],
    ];

    ticks.forEach(([delay, inc]) => {
      t(() => {
        if (done) return;
        current = Math.min(100, current + inc);
        setProgress(current);
        if (current >= 100) tryFinish();
      }, delay);
    });

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
      clearAll();
    };
  }, [waitUntil]);

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* ── Background ghost content (behind the frosted layer) ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-8"
        aria-hidden="true"
      >
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

      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          background: "oklch(0.985 0.003 260 / 0.72)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-[380px] flex-col gap-8 px-8 lg:ml-[-8%]">
        <CircleLoader size={56} />

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

  if (!domReady || typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
}
