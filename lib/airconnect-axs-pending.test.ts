import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { airConnectAxsRejection, notifyAirConnectAxsApplicant } from "./airconnect-axs-pending";
import { logExternalApi } from "@/lib/external-api-logger";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/external-api-logger", () => ({
  logExternalApi: vi.fn(),
}));

const APPLICANT = {
  leadId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  applicationRef: "CFAXS-7728950E",
  customerName: "TEST APPLICANT",
  phoneNumber: "+6591234567",
  idNumber: "S1234567D",
};

beforeEach(() => {
  vi.stubEnv("AIRCONNECT_AXS_PENDING_URL", "https://airconnect.test/api/leads/axs");
  vi.stubEnv("AIRCONNECT_API_KEY", "test-key");
  mockFetch.mockReset();
  vi.mocked(logExternalApi).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("notifyAirConnectAxsApplicant", () => {
  it("sends the applicant and the application to AirConnect", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsApplicant(APPLICANT);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://airconnect.test/api/leads/axs");
    expect(JSON.parse(init.body as string)).toEqual(APPLICANT);
  });

  it("never sends a credit limit (AXS customers are not pre-approved)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsApplicant(APPLICANT);

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty("creditLimit");
  });

  it("logs no name and only masked identifiers", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsApplicant(APPLICANT);

    const logged = JSON.stringify(vi.mocked(logExternalApi).mock.calls[0]?.[0]?.body);
    expect(logged).not.toContain("TEST APPLICANT");
    expect(logged).not.toContain("91234567");
    expect(logged).not.toContain("S1234567D");
    expect(logged).toContain("****4567");
    expect(logged).toContain("****567D");
  });

  it("skips quietly when AirConnect isn't configured", async () => {
    vi.stubEnv("AIRCONNECT_AXS_PENDING_URL", "");

    await notifyAirConnectAxsApplicant(APPLICANT);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("never throws when AirConnect is down", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    await expect(notifyAirConnectAxsApplicant(APPLICANT)).resolves.toBeUndefined();
  });
});

describe("rejected applicants", () => {
  it("sends the reason, so AirConnect only keeps a record", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsApplicant({ ...APPLICANT, rejectedBecause: "under_18" });

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.rejectedBecause).toBe("under_18");
    expect(vi.mocked(logExternalApi).mock.calls[0]?.[0]?.tag).toBe("[airconnect/axs-rejected]");
  });

  it("sends no reason for a pending-page applicant", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsApplicant(APPLICANT);

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty("rejectedBecause");
    expect(vi.mocked(logExternalApi).mock.calls[0]?.[0]?.tag).toBe("[airconnect/axs-pending]");
  });

  it("maps each hard reject, and nothing else", () => {
    expect(airConnectAxsRejection("airconnect_reloan")).toBe("existing_customer");
    expect(airConnectAxsRejection("airconnect_not_eligible")).toBe("blacklisted");
    expect(airConnectAxsRejection("under_18")).toBe("under_18");
    for (const r of [null, "foreigner_income_floor", "zero_cap_income_too_low"]) {
      expect(airConnectAxsRejection(r)).toBeNull();
    }
  });
});
