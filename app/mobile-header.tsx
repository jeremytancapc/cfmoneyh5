"use client";

import Image from "next/image";

/**
 * Sticky mobile header — static brand-blue at all scroll positions.
 * Hidden on lg+ (desktop uses the sidebar logo instead).
 */
export function MobileHeader() {
  return (
    <div
      className="sticky top-0 z-50 flex items-center px-6 py-4 lg:hidden"
      style={{ background: "var(--brand-blue-hex)" }}
    >
      <a href="/">
        <Image
          src="/images/cf-money-white.png"
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
