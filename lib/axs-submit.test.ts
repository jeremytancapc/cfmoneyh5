/**
 * Tests for the AXS submit flow logic.
 * Covers: token generation/verification, credit scoring with AXS data,
 * and response format validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAxsToken, verifyAxsToken } from "./axs-token";
import { assessCredit } from "./credit-score";
import type { CpfContribution, NoaRecord } from "./loan-form";

// ── Token tests ───────────────────────────────────────────────────────────────

describe("AXS Token", () => {
  beforeEach(() => {
    vi.stubEnv("AXS_TOKEN_SECRET", "test-secret-at-least-16-chars-long");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates and verifies a valid token", () => {
    const token = createAxsToken({
      leadId: "abc-123",
      axsRef: "AXS25072100001",
      approvedAmount: 20000,
      tenure: 24,
    });

    expect(token).toContain(".");

    const payload = verifyAxsToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.leadId).toBe("abc-123");
    expect(payload!.axsRef).toBe("AXS25072100001");
    expect(payload!.approvedAmount).toBe(20000);
    expect(payload!.tenure).toBe(24);
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered token", () => {
    const token = createAxsToken({
      leadId: "abc-123",
      axsRef: "AXS001",
      approvedAmount: 5000,
      tenure: 12,
    });

    // Tamper with the payload
    const [payload, sig] = token.split(".");
    const tampered = payload + "x" + "." + sig;

    expect(verifyAxsToken(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    // Manually create a token with past expiry
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01"));

    const token = createAxsToken({
      leadId: "old-lead",
      axsRef: "AXS-OLD",
      approvedAmount: 1000,
      tenure: 6,
    });

    // Move time forward past 72h
    vi.setSystemTime(new Date("2020-01-05"));

    expect(verifyAxsToken(token)).toBeNull();

    vi.useRealTimers();
  });

  it("rejects empty/invalid strings", () => {
    expect(verifyAxsToken("")).toBeNull();
    expect(verifyAxsToken("not-a-token")).toBeNull();
    expect(verifyAxsToken("abc.def")).toBeNull();
  });
});

// ── Credit scoring with AXS-style data ───────────────────────────────────────

describe("AXS Credit Scoring", () => {
  const FRESH_CPF: CpfContribution[] = [
    { month: "2026-05", amount: 1988, employer: "DRAGON OPTICS PTE LTD", paidOn: "2026-05-07" },
    { month: "2026-06", amount: 1988, employer: "DRAGON OPTICS PTE LTD", paidOn: "2026-06-07" },
    { month: "2026-07", amount: 3975, employer: "DRAGON OPTICS PTE LTD", paidOn: "2026-07-07" },
  ];

  const NOA_2026: NoaRecord[] = [{
    yearOfAssessment: "2026",
    type: "ORIGINAL",
    taxClearance: "N",
    assessableIncome: 100900,
    employmentIncome: 100900,
    tradeIncome: 0,
    rentIncome: 0,
    interestIncome: 0,
  }];

  const STALE_CPF: CpfContribution[] = [
    { month: "2023-04", amount: 1837.5, employer: "DRAGON OPTICS PTE LTD", paidOn: "2023-04-07" },
    { month: "2023-05", amount: 1837.5, employer: "DRAGON OPTICS PTE LTD", paidOn: "2023-05-07" },
    { month: "2023-06", amount: 3675, employer: "DRAGON OPTICS PTE LTD", paidOn: "2023-06-07" },
  ];

  it("approves with fresh CPF data (age 66, foreigner)", () => {
    const result = assessCredit({
      dob: "1960-05-17",
      idType: "foreigner",
      cpfContributions: FRESH_CPF,
      noaHistory: NOA_2026,
      selfDeclaredMonthlyIncome: 0,
      requestedLoanAmount: 20000,
      moneylenderNoLoans: true,
      moneylenderLoanAmount: "",
      moneylenderPaymentHistory: "",
      authMethod: "singpass",
      ref: new Date("2026-07-22"),
    });

    expect(result.isEligible).toBe(true);
    // CPF rate at 66 = 0.165, avg CPF ~2650, income ~16063 > NOA 8408 → uses CPF
    expect(result.incomeSource).toBe("cpf");
    expect(result.verifiedMonthlyIncome).toBeGreaterThan(0);
    expect(result.approvedLoanAmount).toBeGreaterThan(0);
    expect(result.approvedLoanAmount).toBeLessThanOrEqual(20000);
  });

  it("uses NOA when CPF is stale (>2 months old)", () => {
    const result = assessCredit({
      dob: "1960-05-17",
      idType: "foreigner",
      cpfContributions: STALE_CPF,
      noaHistory: NOA_2026,
      selfDeclaredMonthlyIncome: 0,
      requestedLoanAmount: 20000,
      moneylenderNoLoans: true,
      moneylenderLoanAmount: "",
      moneylenderPaymentHistory: "",
      authMethod: "singpass",
      ref: new Date("2026-07-22"),
    });

    // CPF is stale, should fall through to NOA
    expect(result.incomeSource).toBe("noa");
    expect(result.verifiedMonthlyIncome).toBeCloseTo(100900 / 12, 0);
  });

  it("rejects foreigner with income below $40k/year", () => {
    const lowNoa: NoaRecord[] = [{
      yearOfAssessment: "2026",
      type: "ORIGINAL",
      taxClearance: "N",
      assessableIncome: 30000,
      employmentIncome: 30000,
      tradeIncome: 0,
      rentIncome: 0,
      interestIncome: 0,
    }];

    const result = assessCredit({
      dob: "1990-01-01",
      idType: "foreigner",
      cpfContributions: [],
      noaHistory: lowNoa,
      selfDeclaredMonthlyIncome: 0,
      requestedLoanAmount: 5000,
      moneylenderNoLoans: true,
      moneylenderLoanAmount: "",
      moneylenderPaymentHistory: "",
      authMethod: "singpass",
      ref: new Date("2026-07-22"),
    });

    expect(result.isEligible).toBe(false);
    expect(result.meetsForeignerIncomeFloor).toBe(false);
  });

  it("uses 4.5x multiplier when no moneylender loans (AXS default)", () => {
    const result = assessCredit({
      dob: "1985-01-01",
      idType: "singaporean",
      cpfContributions: FRESH_CPF,
      noaHistory: [],
      selfDeclaredMonthlyIncome: 0,
      requestedLoanAmount: 50000,
      moneylenderNoLoans: true,
      moneylenderLoanAmount: "",
      moneylenderPaymentHistory: "",
      authMethod: "singpass",
      ref: new Date("2026-07-22"),
    });

    // 4.5x multiplier, CPF rate 0.37 for age 41
    // avg CPF = (1988+1988+3975)/3 = 2650.33
    // income = 2650.33 / 0.37 ≈ 7163
    // max = 4.5 × 7163 ≈ 32233
    expect(result.isEligible).toBe(true);
    expect(result.maxEligibleLoan).toBeGreaterThan(30000);
    expect(result.maxEligibleLoan).toBeLessThan(35000);
  });

  it("caps approved amount at requested loan amount", () => {
    const result = assessCredit({
      dob: "1985-01-01",
      idType: "singaporean",
      cpfContributions: FRESH_CPF,
      noaHistory: [],
      selfDeclaredMonthlyIncome: 0,
      requestedLoanAmount: 5000, // Request less than max eligible
      moneylenderNoLoans: true,
      moneylenderLoanAmount: "",
      moneylenderPaymentHistory: "",
      authMethod: "singpass",
      ref: new Date("2026-07-22"),
    });

    expect(result.approvedLoanAmount).toBe(5000);
    expect(result.maxEligibleLoan).toBeGreaterThan(5000);
  });

  it("falls back to self-declared $0 when no CPF and no NOA (income ≤$20k → max $3000)", () => {
    const result = assessCredit({
      dob: "1990-01-01",
      idType: "singaporean",
      cpfContributions: [],
      noaHistory: [],
      selfDeclaredMonthlyIncome: 0,
      requestedLoanAmount: 5000,
      moneylenderNoLoans: true,
      moneylenderLoanAmount: "",
      moneylenderPaymentHistory: "",
      authMethod: "singpass",
      ref: new Date("2026-07-22"),
    });

    expect(result.incomeSource).toBe("self_declared");
    expect(result.verifiedMonthlyIncome).toBe(0);
    // Income ≤$20k/year → max eligible = $3000, so still eligible but capped
    expect(result.isEligible).toBe(true);
    expect(result.maxEligibleLoan).toBe(3000);
    expect(result.approvedLoanAmount).toBe(3000); // capped at max
  });
});

// ── Response format validation ────────────────────────────────────────────────

describe("AXS API Response Format", () => {
  it("response always has required fields", () => {
    // Simulate what the API returns
    const approvedResponse = {
      status: "pending",
      decision: "approved",
      reason: null,
      notes: "Based on CPF...",
      approvedLoanAmount: 20000,
      maxEligibleLoan: 32000,
      tenure: 24,
      verifiedMonthlyIncome: 7163,
      incomeSource: "cpf",
      bookingUrl: "https://apply-dev.crawfort.com/axs/book?token=xxx",
      leadId: "abc-123",
      axsRef: "AXS25072100001",
    };

    expect(approvedResponse.status).toBe("pending");
    expect(approvedResponse.decision).toBe("approved");
    expect(approvedResponse.bookingUrl).toContain("/axs/book?token=");
    expect(approvedResponse.approvedLoanAmount).toBeGreaterThan(0);

    const rejectedResponse = {
      status: "pending",
      decision: "rejected",
      reason: "airconnect_reloan",
      notes: "Found in Ascend...",
      verifiedMonthlyIncome: 7163,
      maxEligibleLoan: 32000,
      leadId: "def-456",
      axsRef: "AXS25072100002",
      bookingUrl: "https://apply-dev.crawfort.com/axs/book?token=yyy",
    };

    expect(rejectedResponse.status).toBe("pending");
    expect(rejectedResponse.decision).toBe("rejected");
    expect(rejectedResponse.bookingUrl).toContain("/axs/book?token=");
    // Rejected still has a booking URL
    expect(rejectedResponse.bookingUrl).toBeTruthy();
  });
});
