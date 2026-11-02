import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyAirConnectAxsPending } from "./airconnect-axs-pending";
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

describe("notifyAirConnectAxsPending", () => {
  it("sends the applicant and the application to AirConnect", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsPending(APPLICANT);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://airconnect.test/api/leads/axs");
    expect(JSON.parse(init.body as string)).toEqual(APPLICANT);
  });

  it("never sends a credit limit (AXS customers are not pre-approved)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsPending(APPLICANT);

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty("creditLimit");
  });

  it("logs no name and only masked identifiers", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "{}" });

    await notifyAirConnectAxsPending(APPLICANT);

    const logged = JSON.stringify(vi.mocked(logExternalApi).mock.calls[0]?.[0]?.body);
    expect(logged).not.toContain("TEST APPLICANT");
    expect(logged).not.toContain("91234567");
    expect(logged).not.toContain("S1234567D");
    expect(logged).toContain("****4567");
    expect(logged).toContain("****567D");
  });

  it("skips quietly when AirConnect isn't configured", async () => {
    vi.stubEnv("AIRCONNECT_AXS_PENDING_URL", "");

    await notifyAirConnectAxsPending(APPLICANT);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("never throws when AirConnect is down", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    await expect(notifyAirConnectAxsPending(APPLICANT)).resolves.toBeUndefined();
  });
});
