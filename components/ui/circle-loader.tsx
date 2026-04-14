"use client";

interface CircleLoaderProps {
  size?: number;
}

/**
 * Spinning arc loader — the entire SVG rotates so the teal dot is always
 * at the arc's leading edge (no dashoffset-to-angle sync required).
 *
 * SVG coords: viewBox 0 0 80 80, circle r=32 cx=40 cy=40
 *   - Arc: 157/201 circumference (~78%), gap = 44px (~79°)
 *   - Gap starts at ~281° and ends at 360°; midpoint at ~320.5°
 *   - Dot sits at gap midpoint (~1 o'clock), orbits as the loader spins
 */
export function CircleLoader({ size = 44 }: CircleLoaderProps) {
  return (
    <div
      className="loader"
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    >
      <svg viewBox="0 0 80 80" aria-hidden="true" overflow="visible">
        {/* Arc: ~78% visible, gap at trailing edge */}
        <circle
          className="loader-arc"
          r="32"
          cy="40"
          cx="40"
        />
        {/* Dot: sits at the midpoint of the gap (~320.5° from 3 o'clock) */}
        <circle
          className="loader-dot"
          r="4"
          cx="64.7"
          cy="19.6"
        />
      </svg>
    </div>
  );
}
