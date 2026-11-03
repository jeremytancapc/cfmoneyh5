"use client";

import { ArrowRight } from "@phosphor-icons/react";

/**
 * Where AXS customers are sent once they are done on CF Money's side.
 *
 * NEXT_PUBLIC_* is inlined at build time, so changing this in Vercel needs a
 * redeploy to take effect — it is not read at runtime. Referenced as a full
 * static expression because Next.js does not inline dynamic lookups.
 *
 * The booked page keeps its own copy of this URL for the same reason; both
 * fall back to the same default so the two pages always hand off to the same
 * place.
 */
const AXS_APP_URL =
  process.env.NEXT_PUBLIC_AXS_APP_URL || "https://app.axs.com.sg/mStation/capc";

/**
 * CTA that sends the customer back to the AXS app. Used on the rejected and
 * pending pages where there is nothing left to do on CF Money's side, so the
 * next step is to close the loop in AXS.
 */
export function AxsReturnButton({ label = "Return to AXS" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.assign(AXS_APP_URL)}
      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal px-4 py-3.5 text-sm font-semibold text-[var(--text-primary)] shadow-[0_4px_16px_-2px_oklch(0.78_0.16_178_/_0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
    >
      {label}
      <ArrowRight size={15} weight="bold" />
    </button>
  );
}
