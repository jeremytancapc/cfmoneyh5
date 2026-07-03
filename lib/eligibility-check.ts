/**
 * AirConnect eligibility check — determines if the customer already exists
 * in Crawford/lender systems before credit scoring.
 *
 * POST https://airconnect.capcfintech.com/api/leads/eligibility
 * Body: { phoneNumber, idNumber? }
 *
 * Response interpretation:
 *  - notes contains "ascend" OR reloanReason exists → RELOAN
 *  - notes contains "exists in leads" → ELIGIBLE (existing customer)
 *  - notes contains "not found in any lists" → ELIGIBLE (brand new)
 *  - isEligible: true (other) → ELIGIBLE
 *  - isEligible: false → NOT ELIGIBLE
 *  - API error → PENDING (don't block the flow)
 */

import { logExternalApi } from "@/lib/external-api-logger";

const LOG = "[eligibility-check]";

export type EligibilityStatus = "ELIGIBLE" | "NOT_ELIGIBLE" | "RELOAN" | "PENDING";

export interface EligibilityResult {
  status: EligibilityStatus;
  notes: string;
  /** If present, this is a reloan customer */
  reloanReason: string | null;
  /** Raw API response for audit */
  raw: Record<string, unknown> | null;
}

interface EligibilityApiResponse {
  isEligible: boolean;
  notes: string;
  reloanReason?: string | null;
}

/**
 * Checks lead eligibility via AirConnect.
 * If idNumber is provided (Singpass), AirConnect matches on NRIC only (ignores phone).
 * Returns PENDING on any error so the flow is never blocked by API failures.
 */
export async function checkLeadEligibility(params: {
  phoneNumber: string;
  idNumber?: string;
  leadId?: string;
}): Promise<EligibilityResult> {
  const apiKey = process.env.AIRCONNECT_API_KEY;
  const url = process.env.AIRCONNECT_ELIGIBILITY_URL;

  if (!apiKey || !url) {
    console.warn(`${LOG} env not configured — skipping eligibility check`, {
      hasApiKey: Boolean(apiKey),
      hasUrl: Boolean(url),
    });
    return { status: "PENDING", notes: "Eligibility check not configured", reloanReason: null, raw: null };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  const requestBody: Record<string, string> = {
    phoneNumber: params.phoneNumber,
  };
  if (params.idNumber) {
    requestBody.idNumber = params.idNumber;
  }

  try {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15_000),
    });

    const ms = Date.now() - started;
    const responseText = await res.text();
    let responseJson: EligibilityApiResponse | null = null;

    try {
      responseJson = JSON.parse(responseText) as EligibilityApiResponse;
    } catch {
      // non-JSON response
    }

    logExternalApi({
      tag: LOG,
      url,
      method: "POST",
      headers,
      body: requestBody,
      status: res.status,
      ok: res.ok,
      ms,
      responseBody: responseText.slice(0, 2000),
      leadId: params.leadId,
    });

    if (!res.ok || !responseJson) {
      return {
        status: "PENDING",
        notes: `API error: ${res.status} — ${responseText.slice(0, 200)}`,
        reloanReason: null,
        raw: responseJson as Record<string, unknown> | null,
      };
    }

    // Interpret the response
    const notes = (responseJson.notes ?? "").toLowerCase();
    const reloanReason = responseJson.reloanReason ?? null;

    // RELOAN: reloanReason exists OR notes contains "ascend" (but not blacklisted)
    // These customers pass through but are flagged for reloan handling
    if (reloanReason || (notes.includes("ascend") && !notes.includes("blacklist"))) {
      return {
        status: "RELOAN",
        notes: responseJson.notes,
        reloanReason,
        raw: responseJson as unknown as Record<string, unknown>,
      };
    }

    // BLACKLISTED: only hard block
    if (notes.includes("blacklist")) {
      return {
        status: "NOT_ELIGIBLE",
        notes: responseJson.notes,
        reloanReason: null,
        raw: responseJson as unknown as Record<string, unknown>,
      };
    }

    // Everything else passes through (CAPC lists, duplicate leads, brand new, etc.)
    return {
      status: "ELIGIBLE",
      notes: responseJson.notes,
      reloanReason: null,
      raw: responseJson as unknown as Record<string, unknown>,
    };
  } catch (err) {
    console.error(`${LOG} fetch error`, err);
    return {
      status: "PENDING",
      notes: `Connection error: ${err instanceof Error ? err.message : "unknown"}`,
      reloanReason: null,
      raw: null,
    };
  }
}
