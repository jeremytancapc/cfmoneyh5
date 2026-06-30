/**
 * Logs external API requests in a detailed format AND persists them to the
 * `api_logs` table in Supabase so you can view them from the dashboard.
 */

import { createAdminClient } from "@/lib/supabase/client";

export interface ExternalApiLog {
  /** Label for the caller, e.g. "[apply/book]" */
  tag: string;
  /** Full URL including query params */
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  /** HTTP status from the response */
  status: number;
  /** Was the response ok (2xx) */
  ok: boolean;
  /** Duration in milliseconds */
  ms: number;
  /** Optional response body (trimmed) */
  responseBody?: string;
  /** Optional lead_id for easy filtering in DB */
  leadId?: string;
  /** If the fetch threw, the error message */
  error?: string;
}

/**
 * Mask sensitive header values (API keys, auth tokens).
 */
function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const isSecret =
      key.toLowerCase().includes("key") ||
      key.toLowerCase().includes("authorization") ||
      key.toLowerCase().includes("token");
    masked[key] = isSecret ? `${value.slice(0, 8)}...` : value;
  }
  return masked;
}

/**
 * Builds a curl-equivalent string from request details.
 */
function toCurl(method: string, url: string, headers: Record<string, string>, body: unknown): string {
  const parts = [`curl --location '${url}'`];
  parts.push(`  --request ${method}`);
  for (const [key, value] of Object.entries(headers)) {
    const isSecret =
      key.toLowerCase().includes("key") ||
      key.toLowerCase().includes("authorization") ||
      key.toLowerCase().includes("token");
    const display = isSecret ? `${value.slice(0, 8)}...` : value;
    parts.push(`  --header '${key}: ${display}'`);
  }
  if (body) {
    const json = typeof body === "string" ? body : JSON.stringify(body, null, 2);
    parts.push(`  --data '${json}'`);
  }
  return parts.join(" \\\n");
}

/**
 * Logs a complete external API call to console AND persists to the api_logs table.
 */
export function logExternalApi(log: ExternalApiLog): void {
  const bodyJson = typeof log.body === "string" ? log.body : JSON.stringify(log.body, null, 2);
  const divider = "═".repeat(60);

  // Console log (kept for real-time visibility in dev/serverless logs)
  console.info(
    [
      "",
      `${log.tag} ╔${divider}`,
      `${log.tag} ║ EXTERNAL API CALL`,
      `${log.tag} ╠${divider}`,
      `${log.tag} ║ ${log.method} ${log.url}`,
      `${log.tag} ╠${"─".repeat(60)}`,
      `${log.tag} ║ HEADERS:`,
      ...Object.entries(maskHeaders(log.headers)).map(([k, v]) => `${log.tag} ║   ${k}: ${v}`),
      `${log.tag} ╠${"─".repeat(60)}`,
      `${log.tag} ║ BODY:`,
      ...bodyJson.split("\n").map((line) => `${log.tag} ║   ${line}`),
      `${log.tag} ╠${"─".repeat(60)}`,
      `${log.tag} ║ RESPONSE: ${log.status} ${log.ok ? "OK" : "FAILED"} (${log.ms}ms)`,
      ...(log.responseBody
        ? [`${log.tag} ║ RESPONSE BODY: ${log.responseBody.slice(0, 500)}`]
        : []),
      `${log.tag} ╠${"─".repeat(60)}`,
      `${log.tag} ║ CURL EQUIVALENT:`,
      ...toCurl(log.method, log.url, log.headers, log.body)
        .split("\n")
        .map((line) => `${log.tag} ║   ${line}`),
      `${log.tag} ╚${divider}`,
      "",
    ].join("\n"),
  );

  // Persist to Supabase — fire-and-forget (don't block the response)
  persistToDb(log).catch((err) => {
    console.error(`${log.tag} Failed to persist api_log to DB`, err);
  });
}

/**
 * Persists the API log entry to Supabase `api_logs` table.
 * Headers are masked before storage (no raw API keys in the DB).
 */
async function persistToDb(log: ExternalApiLog): Promise<void> {
  try {
    const admin = createAdminClient();

    const { error } = await admin.from("api_logs").insert({
      tag: log.tag,
      method: log.method,
      url: log.url,
      request_headers: maskHeaders(log.headers),
      request_body: typeof log.body === "string" ? JSON.parse(log.body) : log.body,
      response_status: log.status,
      response_ok: log.ok,
      response_body: log.responseBody?.slice(0, 2000) ?? null,
      duration_ms: log.ms,
      lead_id: log.leadId ?? null,
      error: log.error ?? null,
    });

    if (error) {
      console.error(`[api-logger] DB insert error`, { code: error.code, message: error.message, details: error.details });
    } else {
      console.info(`[api-logger] Persisted to api_logs`, { tag: log.tag, leadId: log.leadId ?? null });
    }
  } catch (err) {
    // Swallow — we never want DB logging to crash the main flow
    console.error(`[api-logger] DB insert failed`, err);
  }
}
