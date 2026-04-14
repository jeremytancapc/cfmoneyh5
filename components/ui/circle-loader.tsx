"use client";

interface CircleLoaderProps {
  size?: number;
}

/**
 * Spinning arc loader — the entire SVG rotates so the teal dot is always
 * at the arc's leading edge (no dashoffset-to-angle sync required).
 *
 * SVG coords: viewBox 0 0 80 80, circle r=32 cx=40 cy=40
 *   - 3 o'clock (arc start):  cx + r = 72, cy = 40
 *   - Dot sits at the leading edge, orbits as the loader spins
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
        {/* Dot: sits at 3 o'clock — the arc's leading edge */}
        <circle
          className="loader-dot"
          r="4"
          cy="40"
          cx="72"
        />
      </svg>
    </div>
  );
}
