/**
 * Tells AirConnect that an existing borrower applied again through a partner
 * channel and was turned away, so the reloan team sees a note on the borrower.
 *
 * AXS hard-rejects applicants who already hold a loan with us ("contact us
 * directly"), so without this nothing about them ever reaches AirConnect.
 * Best effort: never throws, and only the masked identifiers reach api_logs.
 */

import { logExternalApi } from "@/lib/external-api-logger";

const LOG = "[airconnect/reapply-note]";

/** Last 4 only, e.g. ****567D / ****4567. */
export function maskLast4(value: string): string {
  return value ? `****${value.slice(-4)}` : "";
}

export async function notifyAirConnectReapply(payload: {
  leadId: string;
  phoneNumber: string;
  idNumber?: string;
  source: string;
}): Promise<void> {
  const url = process.env.AIRCONNECT_REAPPLY_NOTE_URL;
  const apiKey = process.env.AIRCONNECT_API_KEY;

  if (!url || !apiKey) {
    console.warn(`${LOG} AIRCONNECT_REAPPLY_NOTE_URL or AIRCONNECT_API_KEY not set — skipping`);
    return;
  }

  const requestBody = {
    phoneNumber: payload.phoneNumber,
    ...(payload.idNumber ? { idNumber: payload.idNumber } : {}),
    source: payload.source,
  };
  const headers: Record<string, string> = { apikey: apiKey, "Content-Type": "application/json" };

  try {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - started;
    const responseBody = await res.text().catch(() => "");

    logExternalApi({
      tag: LOG,
      url,
      method: "POST",
      headers,
      // api_logs is read in chat: identifiers masked, the rest is not personal.
      body: {
        phoneNumber: maskLast4(payload.phoneNumber),
        ...(payload.idNumber ? { idNumber: maskLast4(payload.idNumber) } : {}),
        source: payload.source,
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
