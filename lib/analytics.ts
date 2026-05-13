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

const STEP_NAMES: Record<number, string> = {
  1: "step_01_loan_details",
  2: "step_02_income",
  3: "step_03_singpass_gate",
  4: "step_04_identity",
  5: "step_05_contact",
  6: "step_06_additional",
  7: "step_07_bankruptcy",
  8: "step_08_review",
  9: "step_09_moneylender",
};

export function trackFormStep(stepNumber: number) {
  const name = STEP_NAMES[stepNumber];
  if (!name) return;
  trackEvent(name, { step_number: stepNumber });
}
