/**
 * Thin wrapper around the global gtag function injected by GA4.
 * Safe to call during SSR — no-ops if window/gtag is unavailable.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}

/**
 * Fire a funnel step event using the display step number shown in the UI
 * (i.e. history.length, not the internal step index).
 * Produces event names like step_01, step_02 … step_08.
 */
export function trackDisplayStep(displayStep: number) {
  const name = `step_${String(displayStep).padStart(2, "0")}`;
  trackEvent(name, { step_number: displayStep });
}
