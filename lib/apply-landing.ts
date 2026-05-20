import { enforceApplyFunnel } from "@/lib/apply-funnel-enforce";

/** Call at the top of `/`, `/foreigner`, `/vcsa-sg` before rendering the gate form. */
export async function redirectToApplyContinueIfNeeded(pathname = "/") {
  await enforceApplyFunnel(pathname);
}
