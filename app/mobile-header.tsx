"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * Sticky mobile header — brand-blue at the top of the page,
 * transitions to solid white with a shadow as the user scrolls down.
 * Hidden on lg+ (desktop uses the sidebar logo instead).
 */
export function MobileHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="sticky top-0 z-50 flex items-center px-6 py-4 lg:hidden transition-all duration-300"
      style={{
        background: scrolled ? "#ffffff" : "var(--brand-blue-hex)",
        boxShadow: scrolled ? "0 1px 12px 0 rgba(0,0,0,0.08)" : "none",
      }}
    >
      <a href="/">
        <Image
          src={scrolled ? "/images/cf-money-full-color.png" : "/images/cf-money-white.png"}
          alt="CF Money"
          width={120}
          height={36}
          className="h-5 w-auto"
          priority
        />
      </a>
    </div>
  );
}
