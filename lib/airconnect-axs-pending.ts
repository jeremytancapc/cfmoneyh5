/**
 * Sends an AXS applicant who got the pending page to AirConnect, where they
 * arrive as a Manual Verification lead credited to AXS.
 *
 * Pending-page customers (every foreigner, and SG/PR with no CPF or NOA) get no
 * booking link, so without this nothing about them reaches AirConnect and the
 * team has no lead to follow up. The application uuid travels with them, so a
 * booking an agent later makes in AirConnect is reported back to AXS.
 *
 * Best effort: never throws, and only masked identifiers reach api_logs.
 */

import { maskLast4 } from "@/lib/airconnect-reapply-note";
import { logExternalApi } from "@/lib/external-api-logger";

const LOG = "[airconnect/axs-pending]";

export async function notifyAirConnectAxsPending(payload: {
  leadId: string;
  applicationRef: string;
  customerName: string;
  phoneNumber: string;
  idNumber?: string;
}): Promise<void> {
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
