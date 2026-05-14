"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export function MobileHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-30 flex items-center px-6 lg:hidden transition-all duration-300 ${
        scrolled
          ? "bg-brand-blue shadow-sm py-3"
          : "bg-transparent pb-4 pt-8"
      }`}
    >
      <a href="/" className="relative block h-4">
        <Image
          src="/images/cf-money-full-color.png"
          alt="CF Money"
          width={120}
          height={36}
          className={`absolute inset-0 h-4 w-auto transition-opacity duration-300 ${scrolled ? "opacity-0" : "opacity-100"}`}
          priority
        />
        <Image
          src="/images/cf-money-white.png"
          alt="CF Money"
          width={120}
          height={36}
          className={`h-4 w-auto transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}
          priority
          aria-hidden={!scrolled}
        />
      </a>
    </div>
  );
}
