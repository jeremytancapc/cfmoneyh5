"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ArrowRight } from "@phosphor-icons/react";

const BTN_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] shadow-[0_4px_16px_-2px_oklch(0.78_0.16_178_/_0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]";

// Minimum scroll depth (px) before the floating button is allowed to appear.
// Low enough that a short swipe reveals it, but not instant on page load.
const SCROLL_REVEAL_THRESHOLD = 80;

/**
 * Where AXS customers are sent once their appointment is confirmed.
 *
 * NEXT_PUBLIC_* is inlined at build time, so changing this in Vercel needs a
 * redeploy to take effect — it is not read at runtime. Referenced as a full
 * static expression because Next.js does not inline dynamic lookups.
 */
const AXS_APP_URL =
  process.env.NEXT_PUBLIC_AXS_APP_URL || "https://app.axs.com.sg/mStation/capc";

/** Seconds the confirmation stays on screen before we send them back. */
const REDIRECT_SECONDS = 5;

/**
 * Closes the AXS journey: counts down, then returns the customer to the AXS
 * app. The button is the manual fallback — an automatic navigation can be
 * blocked (in-app webviews are the usual culprit), so it must always be
 * reachable rather than only appearing once the timer has run out.
 */
export function AxsReturnToApp() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [anchorVisible, setAnchorVisible] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  // Navigation only — deliberately sets no state, so the countdown effect below
  // stays free of setState (react-hooks/set-state-in-effect).
  const goToAxs = useCallback(() => {
    window.location.assign(AXS_APP_URL);
  }, []);

  // Countdown, then hand off. Tapping the button just gets there sooner.
  useEffect(() => {
    if (secondsLeft <= 0) {
      goToAxs();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, goToAxs]);

  // Watch anchor visibility via IntersectionObserver
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAnchorVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reveal floating button only after a real scroll — never on initial mount.
  useEffect(() => {
    function onScroll() {
      setScrolledPast(window.scrollY > SCROLL_REVEAL_THRESHOLD);
    }
    // Intentionally NOT calling onScroll() here so the button stays hidden
    // until the user physically starts scrolling.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showFloating = scrolledPast && !anchorVisible;

  const notice =
    secondsLeft <= 0
      ? "Taking you back to the AXS app. If nothing happens, tap the button below."
      : `Returning you to the AXS app in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}.`;

  return (
    <>
      <p
        aria-live="polite"
        className="text-center text-xs text-[var(--text-secondary)]"
      >
        {notice}
      </p>

      {/* In-flow anchor — becomes the button when user reaches the bottom */}
      <button
        ref={anchorRef}
        type="button"
        onClick={goToAxs}
        className={BTN_CLASS}
      >
        Continue to AXS App
        <ArrowRight size={15} weight="bold" />
      </button>

      {/* Floating copy — visible while scrolled past shopfront but anchor not yet in view */}
      {showFloating && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{ animation: "fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <div className="mx-auto max-w-[480px] px-5 py-4">
            <button type="button" onClick={goToAxs} className={BTN_CLASS}>
              Continue to AXS App
              <ArrowRight size={15} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
