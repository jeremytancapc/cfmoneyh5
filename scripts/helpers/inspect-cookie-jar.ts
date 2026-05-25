/**
 * Read apply_session from a curl Netscape cookie jar and print JSON inspection.
 *
 * Usage:
 *   node --experimental-strip-types scripts/helpers/inspect-cookie-jar.ts /path/to/cookies.txt
 *
 * Self-contained (no @/ imports) so shell scripts can run it with plain Node.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const BROWSER_COOKIE_MAX_BYTES = 4096;
const COOKIE_SIZE_WARN_BYTES = 3800;

type SessionShape = {
  authMethod?: string;
  nric?: string;
  fullName?: string;
  amount?: number;
  monthlyIncome?: string;
  cpfContributions?: unknown[];
  noaHistory?: unknown[];
};

function secret(): string {
  return process.env.APPLY_SESSION_SECRET ?? "dev-insecure-secret-32chars-xx";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function decodeSession(raw: string): SessionShape | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(payload);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionShape;
  } catch {
    return null;
  }
}

function canEnterReview(session: SessionShape | null): boolean {
  if (!session) return false;
  if (session.authMethod !== "manual" && session.authMethod !== "singpass") {
    return false;
  }
  const income = session.monthlyIncome?.trim() ?? "";
  if (!session.amount || income === "") return false;
  if (session.authMethod === "singpass") {
    return Boolean(session.nric?.trim() && session.fullName?.trim());
  }
  return true;
}

function readApplySessionFromJar(jarPath: string): string | null {
  const lines = readFileSync(jarPath, "utf8").split("\n");
  for (let line of lines) {
    if (!line) continue;
    // curl marks HttpOnly cookies as "#HttpOnly_<domain>\t..."
    if (line.startsWith("#HttpOnly_")) {
      line = line.slice("#HttpOnly_".length);
    } else if (line.startsWith("#")) {
      continue;
    }
    const parts = line.split("\t");
    if (parts.length >= 7 && parts[5] === "apply_session") {
      return parts[6]?.trim() ?? null;
    }
  }
  return null;
}

const jarPath = process.argv[2];
if (!jarPath) {
  console.error("Usage: inspect-cookie-jar.ts <cookie-jar>");
  process.exit(2);
}

const value = readApplySessionFromJar(jarPath);
if (!value) {
  console.log(JSON.stringify({ error: "apply_session cookie not found" }));
  process.exit(1);
}

const session = decodeSession(value);
const inspect = {
  bytes: value.length,
  decodeOk: session !== null,
  canEnterReview: canEnterReview(session),
  hasNric: Boolean(session?.nric?.trim()),
  hasFullName: Boolean(session?.fullName?.trim()),
  cpfCount: session?.cpfContributions?.length ?? 0,
  noaCount: session?.noaHistory?.length ?? 0,
  exceedsBrowserMax: value.length > BROWSER_COOKIE_MAX_BYTES,
  exceedsWarnThreshold: value.length >= COOKIE_SIZE_WARN_BYTES,
};

console.log(JSON.stringify(inspect));
