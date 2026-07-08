"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowRight } from "@phosphor-icons/react";

const BTN_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] shadow-[0_4px_16px_-2px_oklch(0.78_0.16_178_/_0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]";

// Roughly the scroll depth at which the shopfront image enters view on mobile.
const SHOPFRONT_SCROLL_THRESHOLD = 280;

/**
 * Renders an in-flow anchor button at the bottom of the page.
 * A fixed floating copy appears only after the user has scrolled past the
 * shopfront image, and disappears again once the anchor button itself is visible.
 */
export function AxsBackButton() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [anchorVisible, setAnchorVisible] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);

  // Watch anchor visibility
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

  // Show floating button only after user scrolls past the shopfront image
  useEffect(() => {
    function onScroll() {
      setScrolledPast(window.scrollY > SHOPFRONT_SCROLL_THRESHOLD);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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
