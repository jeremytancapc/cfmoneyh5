/**
 * Sends an AXS applicant who never books through the H5 to AirConnect:
 *
 * - Pending page (every foreigner, and SG/PR with no CPF or NOA): they arrive as
 *   a Manual Verification lead credited to AXS, for the team to follow up. The
 *   application uuid travels with them, so a booking an agent later makes in
 *   AirConnect is reported back to AXS.
 * - Rejected (existing customer, blacklisted, under 18): AirConnect only keeps a
 *   record lead (`unqualified`, source AXS), so every AXS applicant is counted.
 *
 * Best effort: never throws, and only masked identifiers reach api_logs.
 */

import { maskLast4 } from "@/lib/airconnect-reapply-note";
import { logExternalApi } from "@/lib/external-api-logger";

/** Why the H5 rejected an AXS applicant, in AirConnect's words. */
export type AirConnectAxsRejection = "existing_customer" | "blacklisted" | "under_18";

/** The AirConnect reason for one of our hard-reject codes, or null for any other. */
export function airConnectAxsRejection(reason: string | null): AirConnectAxsRejection | null {
  switch (reason) {
    case "airconnect_reloan":
      return "existing_customer";
    case "airconnect_not_eligible":
      return "blacklisted";
    case "under_18":
      return "under_18";
    default:
      return null;
  }
}

export async function notifyAirConnectAxsApplicant(payload: {
  leadId: string;
  applicationRef: string;
  customerName: string;
  phoneNumber: string;
  idNumber?: string;
  /** Set for a rejected applicant; absent for a pending-page one. */
  rejectedBecause?: AirConnectAxsRejection;
}): Promise<void> {
  const LOG = payload.rejectedBecause ? "[airconnect/axs-rejected]" : "[airconnect/axs-pending]";
  const url = process.env.AIRCONNECT_AXS_PENDING_URL;
  const apiKey = process.env.AIRCONNECT_API_KEY;

  if (!url || !apiKey) {
    console.warn(`${LOG} AIRCONNECT_AXS_PENDING_URL or AIRCONNECT_API_KEY not set — skipping`);
    return;
  }

  const requestBody = {
    customerName: payload.customerName,
    phoneNumber: payload.phoneNumber,
    ...(payload.idNumber ? { idNumber: payload.idNumber } : {}),
    leadId: payload.leadId,
    applicationRef: payload.applicationRef,
    ...(payload.rejectedBecause ? { rejectedBecause: payload.rejectedBecause } : {}),
  };
  const headers: Record<string, string> = { apikey: apiKey, "Content-Type": "application/json" };

  try {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(25_000),
    });
    const ms = Date.now() - started;
    const responseBody = await res.text().catch(() => "");

    logExternalApi({
      tag: LOG,
      url,
      method: "POST",
      headers,
      // api_logs is read in chat: no name, identifiers masked.
      body: {
        phoneNumber: maskLast4(payload.phoneNumber),
        ...(payload.idNumber ? { idNumber: maskLast4(payload.idNumber) } : {}),
        leadId: payload.leadId,
        applicationRef: payload.applicationRef,
        ...(payload.rejectedBecause ? { rejectedBecause: payload.rejectedBecause } : {}),
      },
      status: res.status,
      ok: res.ok,
      ms,
      responseBody: responseBody.slice(0, 200),
      leadId: payload.leadId,
    });

    if (!res.ok) console.error(`${LOG} failed`, { status: res.status, ms });
  } catch (err) {
    console.error(`${LOG} error`, err);
  }
}
