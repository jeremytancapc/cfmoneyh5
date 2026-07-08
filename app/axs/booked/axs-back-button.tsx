"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowRight } from "@phosphor-icons/react";

const BTN_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] shadow-[0_4px_16px_-2px_oklch(0.78_0.16_178_/_0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]";

// Minimum scroll depth (px) before the floating button is allowed to appear.
// Low enough that a short swipe reveals it, but not instant on page load.
const SCROLL_REVEAL_THRESHOLD = 80;

/**
 * Renders an in-flow anchor button at the bottom of the page.
 * A fixed floating copy appears only after the user has scrolled at least
 * SCROLL_REVEAL_THRESHOLD px, and disappears once the anchor itself is visible.
 */
export function AxsBackButton() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [anchorVisible, setAnchorVisible] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);

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

  return (
    <>
      {/* In-flow anchor — becomes the button when user reaches the bottom */}
      <button
        ref={anchorRef}
        type="button"
        onClick={() => window.history.back()}
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
            <button
              type="button"
              onClick={() => window.history.back()}
              className={BTN_CLASS}
            >
              Continue to AXS App
              <ArrowRight size={15} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
