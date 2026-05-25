import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

import {
  BROWSER_COOKIE_MAX_BYTES,
  mergeActivateSession,
  funnelRedirectForReviewSession,
} from "./apply-session-inspect";
import { buildActivateSessionCookie } from "./apply-session-slim";

const PRE_SINGPASS: Parameters<typeof mergeActivateSession>[0] = {
  authMethod: "singpass",
  amount: 5000,
  tenure: 6,
  monthlyIncome: "5000",
  urgency: "within_week",
  applyTraceId: "00000000-0000-4000-8000-000000000001",
};

function loadCallbackMyInfo(fixture: string): Record<string, unknown> {
  const raw = JSON.parse(
    readFileSync(resolve(__dirname, fixture), "utf8"),
  ) as { myinfo?: Record<string, unknown> };
  if (!raw.myinfo) throw new Error(`fixture missing myinfo: ${fixture}`);
  return raw.myinfo;
}

describe("Singpass activate session cookie budget", () => {
  beforeAll(() => {
    process.env.APPLY_SESSION_SECRET ??=
      "test-secret-32-characters-minimum!!";
  });

  it("minimal MyInfo stays well under the browser cookie limit", () => {
    const myinfo = loadCallbackMyInfo("../scripts/fixtures/singpass-callback-minimal.json");
    const { inspect } = mergeActivateSession(PRE_SINGPASS, myinfo);

    expect(inspect.decodeOk).toBe(true);
    expect(inspect.canEnterReview).toBe(true);
    expect(inspect.exceedsBrowserMax).toBe(false);
    expect(inspect.bytes).toBeLessThan(BROWSER_COOKIE_MAX_BYTES);
  });

  /**
   * Regression: production customers (29+ CPF rows, e.g. +65 91451126) exceeded ~4 KB
   * and were bounced to `/` after Singpass. Must pass once bulk MyInfo moves server-side.
   */
  it("production-scale MyInfo (29 CPF rows) merged session fits in browser cookie limit", () => {
    const myinfo = loadCallbackMyInfo(
      "../scripts/fixtures/singpass-callback-production-scale.json",
    );
    const { merged, inspect } = mergeActivateSession(PRE_SINGPASS, myinfo);

    expect(inspect.decodeOk).toBe(true);
    expect(inspect.hasNric).toBe(true);
    expect(inspect.hasFullName).toBe(true);
    expect(inspect.canEnterReview).toBe(true);
    expect(inspect.cpfCount).toBe(0);
    expect(merged.cpfContributions?.length ?? 0).toBeGreaterThanOrEqual(29);
    expect(inspect.exceedsBrowserMax).toBe(false);
    expect(inspect.bytes).toBeLessThan(BROWSER_COOKIE_MAX_BYTES);
  });

  it("staging mock MyInfo (15 CPF rows) also stays under limit after slimming", () => {
    const myinfo = loadCallbackMyInfo("../lib/mock-singpass-payload.json");
    const { inspect } = mergeActivateSession(PRE_SINGPASS, myinfo);

    expect(inspect.exceedsBrowserMax).toBe(false);
    expect(inspect.bytes).toBeLessThan(BROWSER_COOKIE_MAX_BYTES);
  });

  it("slim cookie keeps user on review when visiting home or other landings", () => {
    const myinfo = loadCallbackMyInfo(
      "../scripts/fixtures/singpass-callback-production-scale.json",
    );
    const { merged } = mergeActivateSession(PRE_SINGPASS, myinfo);
    const slim = buildActivateSessionCookie(merged);

    expect(funnelRedirectForReviewSession(slim, "/")).toBe("/apply/review");
    expect(funnelRedirectForReviewSession(slim, "/foreigner")).toBe("/apply/review");
    expect(funnelRedirectForReviewSession(slim, "/apply/review")).toBeNull();
  });

  it("gate without MyInfo identity does not enter review (pre-Singpass tap only)", () => {
    const encoded = mergeActivateSession(
      { ...PRE_SINGPASS, authMethod: "singpass" },
      {},
    );
    // Empty myinfo → no nric/name
    expect(encoded.inspect.canEnterReview).toBe(false);
    expect(funnelRedirectForReviewSession(encoded.merged, "/apply/review")).toBe("/");
  });
});
