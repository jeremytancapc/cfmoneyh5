/**
 * AXS booking token — signed HMAC token containing the leadId.
 * Used to generate secure one-time booking links for AXS customers.
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 * Payload: { leadId, axsRef, exp }
 */

import { createHmac } from "crypto";

const TOKEN_EXPIRY_HOURS = 72;

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
  exp: number; // Unix timestamp
}

/**
 * Creates a signed token for the AXS booking link.
 */
export function createAxsToken(data: Omit<AxsTokenPayload, "exp">): string {
  const secret = getSecret();
  const payload: AxsTokenPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600,
  };
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

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
