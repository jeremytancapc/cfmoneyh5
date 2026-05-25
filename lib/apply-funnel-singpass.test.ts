import { describe, it, expect } from "vitest";

import {
  canEnterReview,
  getFunnelRedirectUrl,
  resolveApplyFunnelStage,
  type ApplyFunnelContext,
} from "./apply-funnel";
import type { LoanFormData } from "./loan-form";

function ctx(overrides: Partial<ApplyFunnelContext>): ApplyFunnelContext {
  return {
    pathname: "/",
    session: null,
    hasApplyGate: false,
    hasReviewGate: false,
    approvalOffer: null,
    hasBookingConfirm: false,
    queryLeadId: null,
    ...overrides,
  };
}

const SINGPASS_REVIEW_SESSION: Partial<LoanFormData> = {
  authMethod: "singpass",
  amount: 4000,
  tenure: 6,
  monthlyIncome: "5000",
  fullName: "TEST USER",
  nric: "S1234567A",
  mobile: "91234567",
};

const MANUAL_REVIEW_SESSION: Partial<LoanFormData> = {
  authMethod: "manual",
  amount: 4000,
  tenure: 6,
  monthlyIncome: "5000",
};

describe("Singpass / manual review funnel", () => {
  describe("post-MyInfo Singpass — must stay on review", () => {
    const reviewCtx = ctx({
      session: SINGPASS_REVIEW_SESSION,
      hasApplyGate: true,
    });

    it("canEnterReview passes with gate + MyInfo identity", () => {
      expect(canEnterReview(SINGPASS_REVIEW_SESSION)).toBe(true);
      expect(resolveApplyFunnelStage(reviewCtx)).toBe("review");
    });

    it("reload /apply/review is allowed", () => {
      expect(
        getFunnelRedirectUrl({ ...reviewCtx, pathname: "/apply/review" }),
      ).toBeNull();
    });

    it("home and alternate landings redirect back to review", () => {
      expect(getFunnelRedirectUrl({ ...reviewCtx, pathname: "/" })).toBe(
        "/apply/review",
      );
      expect(
        getFunnelRedirectUrl({ ...reviewCtx, pathname: "/foreigner" }),
      ).toBe("/apply/review");
      expect(
        getFunnelRedirectUrl({ ...reviewCtx, pathname: "/vcsa-sg" }),
      ).toBe("/apply/review");
    });

    it("cannot wander to approval before submit", () => {
      expect(
        getFunnelRedirectUrl({ ...reviewCtx, pathname: "/apply/approval" }),
      ).toBe("/apply/review");
    });
  });

  describe("pre-MyInfo Singpass tap — must NOT reach review", () => {
    const preMyinfo: Partial<LoanFormData> = {
      authMethod: "singpass",
      amount: 4000,
      tenure: 6,
      monthlyIncome: "5000",
    };

    it("canEnterReview fails without MyInfo identity", () => {
      expect(canEnterReview(preMyinfo)).toBe(false);
    });

    it("no apply_gate: /apply/review redirects away", () => {
      expect(
        getFunnelRedirectUrl(
          ctx({ session: preMyinfo, hasApplyGate: false, pathname: "/apply/review" }),
        ),
      ).toBe("/");
    });

    it("home stays on landing when Singpass not completed", () => {
      expect(
        getFunnelRedirectUrl(
          ctx({ session: preMyinfo, hasApplyGate: false, pathname: "/" }),
        ),
      ).toBeNull();
    });
  });

  describe("cookie lost after activate — simulates oversized session drop", () => {
    it("apply_gate set but session missing MyInfo → bounced from review to home", () => {
      const preOnly: Partial<LoanFormData> = {
        authMethod: "singpass",
        amount: 4000,
        tenure: 6,
        monthlyIncome: "5000",
      };
      expect(
        getFunnelRedirectUrl(
          ctx({ session: preOnly, hasApplyGate: true, pathname: "/apply/review" }),
        ),
      ).toBe("/");
    });
  });

  describe("manual flow before identity step", () => {
    const manualCtx = ctx({
      session: MANUAL_REVIEW_SESSION,
      hasApplyGate: true,
    });

    it("manual with gate can enter review without MyInfo", () => {
      expect(canEnterReview(MANUAL_REVIEW_SESSION)).toBe(true);
      expect(resolveApplyFunnelStage(manualCtx)).toBe("review");
    });

    it("cleared session (back button) returns to landing", () => {
      expect(
        getFunnelRedirectUrl(
          ctx({ session: null, hasApplyGate: false, pathname: "/" }),
        ),
      ).toBeNull();
      expect(
        getFunnelRedirectUrl(
          ctx({ session: null, hasApplyGate: false, pathname: "/apply/review" }),
        ),
      ).toBe("/");
    });
  });
});
