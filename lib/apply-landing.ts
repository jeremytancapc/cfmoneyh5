import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { GATE_COOKIE, getApplySession } from "@/lib/apply-session";
import {
  APPLY_CONTINUE_PATH,
  shouldRedirectToApplyContinue,
} from "@/lib/apply-flow-guard";

/** Call at the top of `/`, `/foreigner`, `/vcsa-sg` before rendering the gate form. */
export async function redirectToApplyContinueIfNeeded() {
  const session = await getApplySession();
  const cookieStore = await cookies();
  const hasApplyGate = cookieStore.get(GATE_COOKIE)?.value === "1";

  if (shouldRedirectToApplyContinue(session, hasApplyGate)) {
    redirect(APPLY_CONTINUE_PATH);
  }
}
