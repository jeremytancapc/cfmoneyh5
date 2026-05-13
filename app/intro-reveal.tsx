"use client";

import React, { useEffect, useRef } from "react";

/**
 * Thin client leaf that drives the staggered entrance animation on the intro page.
 * Uses IntersectionObserver to set `data-revealed="true"` once on mount.
 * CSS in globals.css reads `[data-revealed="true"] > *` and staggers each child
 * via --stagger-index custom property.
 */
export function IntroReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.revealed = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Assign --stagger-index to each direct child via inline style
  const staggered = React.Children.map(children, (child, i) => {
    if (!React.isValidElement(child)) return child;
    return React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
      style: {
        ...(child as React.ReactElement<{ style?: React.CSSProperties }>).props.style,
        ["--stagger-index" as string]: i,
      },
    });
  });

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {staggered}
    </div>
  );
}
