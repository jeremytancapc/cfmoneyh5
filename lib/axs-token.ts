/**
 * AXS booking token — signed HMAC token containing the leadId.
 * Used to generate secure one-time booking links for AXS customers.
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 * Payload: { leadId, axsRef, approvedAmount, tenure }
 *
 * Booking links do not expire. Customers were losing their link before they
 * got round to booking, with no way to recover it — the page just bounced them
 * to /axs with no explanation. What now bounds reuse is the one-booking-per-
 * application rule in /api/axs/book: once an appointment exists, the link
 * redirects to the confirmation and a second booking is refused.
 *
 * The trade-off is that the link is a permanent bearer credential, so anyone
 * who obtains the URL can book with it, and the approved amount it carries
 * never goes stale on its own. `exp` is still honoured when present so tokens
 * minted before this change keep their original lifetime.
 */

import { createHmac } from "crypto";

function getSecret(): string {
  const secret = process.env.AXS_TOKEN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AXS_TOKEN_SECRET env var is missing or too short (min 16 chars)");
  }
  return secret;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export interface AxsTokenPayload {
  leadId: string;
  axsRef: string;
  approvedAmount: number;
  tenure: number;
  /** Only present on tokens minted before booking links became permanent. */
  exp?: number;
}

/**
 * Creates a signed token for the AXS booking link.
 */
export function createAxsToken(data: Omit<AxsTokenPayload, "exp">): string {
  const secret = getSecret();
  // No exp — see the note at the top of this file.
  const payload: AxsTokenPayload = { ...data };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

/**
 * Verifies and decodes an AXS booking token.
 * Returns the payload if valid, or null if expired/tampered.
 */
export function verifyAxsToken(token: string): AxsTokenPayload | null {
  try {
    const secret = getSecret();
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expectedSig = sign(encoded, secret);
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(base64UrlDecode(encoded)) as AxsTokenPayload;

    // Legacy tokens carry an expiry; new ones do not. Still enforced when
    // present so a link already issued with a lifetime keeps it.
    if (payload.exp !== undefined && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
