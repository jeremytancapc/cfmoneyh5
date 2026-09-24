/**
 * Tests for customer-facing application refs.
 * These strings are quoted by customers and read back by consultants, and the
 * AXS partner parses them out of the API response, so the format is a contract.
 */

import { describe, it, expect } from "vitest";
import {
  axsApplicationRef,
  cfh5ApplicationRef,
  looksLikeLeadUuid,
  refSuffix,
} from "./lead-id";

const LEAD_UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("refSuffix", () => {
  it("takes the last 8 hex characters, uppercased", () => {
    expect(refSuffix(LEAD_UUID)).toBe("E82C3301");
  });

  it("is always 8 characters", () => {
    expect(refSuffix(LEAD_UUID)).toHaveLength(8);
  });

  it("matches the pre-refactor derivation for well-formed UUIDs", () => {
    // The old per-route copies used leadId.slice(-8) without stripping hyphens.
    // A UUID's final group is 12 hex chars, so both forms agree — this pins
    // that equivalence so the dedupe provably changed no existing ref.
    expect(refSuffix(LEAD_UUID)).toBe(LEAD_UUID.slice(-8).toUpperCase());
  });
});

describe("application refs", () => {
  it("builds the H5 ref", () => {
    expect(cfh5ApplicationRef(LEAD_UUID)).toBe("CFH5-E82C3301");
  });

  it("builds the AXS ref", () => {
    expect(axsApplicationRef(LEAD_UUID)).toBe("CFAXS-E82C3301");
  });

  it("shares one suffix across channels, so the same lead stays searchable", () => {
    const suffix = refSuffix(LEAD_UUID);
    expect(cfh5ApplicationRef(LEAD_UUID)).toBe(`CFH5-${suffix}`);
    expect(axsApplicationRef(LEAD_UUID)).toBe(`CFAXS-${suffix}`);
  });

  it("gives different leads different refs", () => {
    const other = "9c1e77a2-0b31-4c7e-8f10-aa11bb22cc33";
    expect(axsApplicationRef(other)).not.toBe(axsApplicationRef(LEAD_UUID));
  });
});

describe("looksLikeLeadUuid", () => {
  it("accepts a well-formed UUID", () => {
    expect(looksLikeLeadUuid(LEAD_UUID)).toBe(true);
  });

  it("rejects an application ref", () => {
    expect(looksLikeLeadUuid("CFAXS-E82C3301")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(looksLikeLeadUuid("")).toBe(false);
  });
});
