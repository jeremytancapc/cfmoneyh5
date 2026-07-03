import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkLeadEligibility } from "./eligibility-check";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock env vars
beforeEach(() => {
  vi.stubEnv("AIRCONNECT_ELIGIBILITY_API_KEY", "test-key-123");
  vi.stubEnv("AIRCONNECT_ELIGIBILITY_URL", "https://airconnect.test/api/leads/eligibility");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Mock the external-api-logger to avoid DB calls in tests
vi.mock("@/lib/external-api-logger", () => ({
  logExternalApi: vi.fn(),
}));

function mockResponse(body: object, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe("checkLeadEligibility", () => {
  describe("pass-through cases (ELIGIBLE)", () => {
    it("brand new customer — not found in any lists", async () => {
      mockResponse({
        isEligible: true,
        notes: "not found in any lists",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("ELIGIBLE");
      expect(result.notes).toContain("not found in any lists");
    });

    it("existing lead in system (phone exists) — still passes through", async () => {
      mockResponse({
        success: true,
        phoneNumber: "+6587121544",
        isEligible: false,
        status: "unqualified",
        notes: "Phone number already exists in leads 57065 with status assigned",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6587121544" });

      expect(result.status).toBe("ELIGIBLE");
      expect(result.notes).toContain("already exists in leads");
    });

    it("found in CAPC lists (existing borrower) — passes through", async () => {
      mockResponse({
        isEligible: false,
        notes: "Found in CAPC lists: Borrower",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("ELIGIBLE");
    });

    it("isEligible true with exists in leads — passes through", async () => {
      mockResponse({
        isEligible: true,
        notes: "exists in leads status APPROVED",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("ELIGIBLE");
    });
  });

  describe("blocked cases", () => {
    it("blacklisted borrower — blocked", async () => {
      mockResponse({
        isEligible: false,
        notes: "Blacklisted borrower",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("NOT_ELIGIBLE");
      expect(result.notes).toContain("Blacklisted");
    });

    it("reloanReason set — blocked as RELOAN", async () => {
      mockResponse({
        isEligible: false,
        notes: "Found in Ascend as BORROWER",
        reloanReason: "Previous loan completed",
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("RELOAN");
      expect(result.reloanReason).toBe("Previous loan completed");
    });

    it("notes contains ascend (no reloanReason) — blocked as RELOAN", async () => {
      mockResponse({
        isEligible: false,
        notes: "Found in Ascend system",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("RELOAN");
    });

    it("ascend + blacklisted — blocked as NOT_ELIGIBLE (blacklist takes priority)", async () => {
      mockResponse({
        isEligible: false,
        notes: "Found in Ascend - Blacklisted borrower",
        reloanReason: null,
      });

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      // Blacklist check comes after reloan check, but the reloan check
      // excludes blacklisted, so this falls through to blacklist
      expect(result.status).toBe("NOT_ELIGIBLE");
    });
  });

  describe("error handling (PENDING — never blocks)", () => {
    it("API returns 500 — PENDING", async () => {
      mockResponse({ error: "Internal server error" }, 500);

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("PENDING");
    });

    it("fetch throws network error — PENDING", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("PENDING");
      expect(result.notes).toContain("Connection refused");
    });

    it("env vars not configured — PENDING", async () => {
      vi.stubEnv("AIRCONNECT_ELIGIBILITY_API_KEY", "");
      vi.stubEnv("AIRCONNECT_ELIGIBILITY_URL", "");

      const result = await checkLeadEligibility({ phoneNumber: "+6591234567" });

      expect(result.status).toBe("PENDING");
      expect(result.notes).toContain("not configured");
    });
  });

  describe("idNumber handling", () => {
    it("sends idNumber when provided (Singpass)", async () => {
      mockFetch.mockReset();
      mockResponse({ isEligible: true, notes: "not found in any lists", reloanReason: null });

      await checkLeadEligibility({ phoneNumber: "+6591234567", idNumber: "S1234567A" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const fetchBody = JSON.parse(options.body);
      expect(fetchBody.phoneNumber).toBe("+6591234567");
      expect(fetchBody.idNumber).toBe("S1234567A");
    });

    it("does NOT send idNumber when not provided (manual)", async () => {
      mockFetch.mockReset();
      mockResponse({ isEligible: true, notes: "not found in any lists", reloanReason: null });

      await checkLeadEligibility({ phoneNumber: "+6591234567" });

      const [, options] = mockFetch.mock.calls[0];
      const fetchBody = JSON.parse(options.body);
      expect(fetchBody.phoneNumber).toBe("+6591234567");
      expect(fetchBody).not.toHaveProperty("idNumber");
    });
  });
});
