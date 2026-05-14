"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Step4_Identity,
  Step6_Contact,
  Step7_Additional,
  Step7_BankruptcyDeclaration,
  Step8_Review,
  Step9_MoneylenderLoans,
  StepIndicator,
} from "@/app/loan-application-form";
import type { LoanFormData } from "@/lib/loan-form";
import { calculateMonthlyRepayment } from "@/lib/loan-form";
import { trackDisplayStep, trackEvent } from "@/lib/analytics";
import { LoanLoadingScreen } from "@/app/loan-loading-screen";

interface Props {
  initialData: LoanFormData;
}

// Internal step numbers (same as original form)
// 4=Identity, 5=Contact, 6=Additional, 7=Bankruptcy, 8=Review, 9=Moneylender

export function ReviewForm({ initialData }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<LoanFormData>(initialData);
  const [submitOverlay, setSubmitOverlay] = useState<{
    waitUntil: Promise<unknown>;
    key: number;
  } | null>(null);
  const submitNavRef = useRef<string | null>(null);
  const submitLeadIdRef = useRef<string | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Singpass users skip identity (already filled); manual users start at 4.
  const firstStep = initialData.authMethod === "singpass" ? 8 : 4;
  const [history, setHistory] = useState<number[]>([firstStep]);
  const step = history[history.length - 1];

  useEffect(() => { setMounted(true); }, []);

  const updateField = useCallback(
    <K extends keyof LoanFormData>(key: K, value: LoanFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const monthlyRepayment = useMemo(
    () => calculateMonthlyRepayment(formData.amount, formData.tenure),
    [formData.amount, formData.tenure],
  );

  const canProceed = useMemo(() => {
    switch (step) {
      case 4:
        return (
          formData.idType !== "" &&
          formData.fullName.trim().length > 1 &&
          formData.nric.trim().length > 3
        );
      case 5:
        return formData.mobile.trim().length >= 8;
      case 6:
        return true;
      case 7:
        return (
          formData.bankruptcyDeclaration !== "" &&
          formData.bankruptcyDeclaration !== "active"
        );
      case 8:
        return true;
      case 9: {
        const rawAmount = formData.moneylenderLoanAmount ?? "";
        const hasAmount =
          rawAmount.trim() !== "" && !Number.isNaN(parseInt(rawAmount, 10));
        return (
          formData.moneylenderNoLoans === true ||
          (hasAmount && (formData.moneylenderPaymentHistory ?? "") !== "")
        );
      }
      default:
        return false;
    }
  }, [step, formData]);

  const navigateTo = useCallback((next: number) => {
    setHistory((h) => [...h, next]);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // history.length + 3 == displayStep (apply page covered steps 1-3).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    trackDisplayStep(history.length + 3);
  }, [history]);

  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const [isBottomCtaVisible, setIsBottomCtaVisible] = useState(false);

  useEffect(() => {
    const el = bottomCtaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsBottomCtaVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [step]);

  const scrollToBottomCta = useCallback(() => {
    bottomCtaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function submitApplication() {
    if (submitOverlay) return;
    submitNavRef.current = null;
    submitLeadIdRef.current = null;
    const task = (async () => {
      const res = await fetch("/api/apply/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        console.error("Submit failed", await res.text());
        return;
      }
      const result = (await res.json()) as { isEligible: boolean; leadId?: string };
      submitNavRef.current = result.isEligible ? "/apply/approval" : "/apply/pending";
      submitLeadIdRef.current = typeof result.leadId === "string" ? result.leadId : null;
      if (result.isEligible) trackEvent("step_09_offer_presented");
    })();

    void task.catch(() => {
      /* non-2xx handled inside task; this is for network / parse errors */
    });

    setSubmitOverlay({
      waitUntil: task.finally(() => {}),
      key: Date.now(),
    });
  }

  const handleNext = useCallback(() => {
    // Step 4 (Identity) → jump to review (8)
    if (step === 4) { navigateTo(8); scrollToTop(); return; }
    // Post-review: contact (5) → bankruptcy (7), skipping additional (6)
    if (step === 5 && history.includes(8)) { navigateTo(7); scrollToTop(); return; }
    // Post-review: bankruptcy (7) → moneylender (9)
    if (step === 7 && history.includes(8)) { navigateTo(9); scrollToTop(); return; }
    navigateTo(step + 1);
    scrollToTop();
  }, [step, history, navigateTo, scrollToTop]);

  const handleBack = useCallback(() => {
    if (history.length > 1) {
      setHistory((h) => h.slice(0, -1));
      scrollToTop();
    } else {
      router.push("/");
    }
  }, [history, scrollToTop, router]);

  // Step 8 (Review) "Yes, I confirm" → go to contact step
  const handleReviewConfirm = useCallback(() => {
    navigateTo(5);
    scrollToTop();
  }, [navigateTo, scrollToTop]);

  // Progress indicator: count unique logical steps for display
  const singpassFlow = formData.authMethod === "singpass";
  const totalDisplay = singpassFlow ? 7 : 8;
  const displayStep = history.length + 3; // offset: apply page was steps 1-3

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      {submitOverlay ? (
        <LoanLoadingScreen
          key={submitOverlay.key}
          waitUntil={submitOverlay.waitUntil}
          onComplete={() => {
            const path = submitNavRef.current;
            const leadId = submitLeadIdRef.current;
            if (path === "/apply/pending" && leadId) {
              router.push(`/apply/pending?leadId=${encodeURIComponent(leadId)}`);
            } else if (path) {
              router.push(path);
            }
            setSubmitOverlay(null);
          }}
        />
      ) : null}

      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10">
          <div className="mb-16">
            <Image src="/images/cf-money-white.png" alt="CF Money" width={160} height={48} className="h-6 w-auto" priority />
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-[var(--text-on-brand)] max-w-[420px]">
            Almost there…
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            Fill in the remaining details and review your application before submission.
          </p>
        </div>
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <div className="flex items-center px-6 pb-4 pt-8 lg:hidden">
          <a href="/">
            <Image src="/images/cf-money-full-color.png" alt="CF Money" width={120} height={36} className="h-4 w-auto" priority />
          </a>
        </div>

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <StepIndicator current={displayStep} total={totalDisplay} />

            <div key={step} className="animate-slide-in">
              {step === 4 && (
                <Step4_Identity formData={formData} updateField={updateField} />
              )}
              {step === 5 && (
                <Step6_Contact formData={formData} updateField={updateField} />
              )}
              {step === 6 && (
                <Step7_Additional formData={formData} updateField={updateField} />
              )}
              {step === 7 && (
                <Step7_BankruptcyDeclaration
                  formData={formData}
                  updateField={updateField}
                  onClear={scrollToBottomCta}
                />
              )}
              {step === 8 && (
                <Step8_Review
                  formData={formData}
                  updateField={updateField}
                  monthlyRepayment={monthlyRepayment}
                  onModalOpenChange={setIsLegalModalOpen}
                />
              )}
              {step === 9 && (
                <Step9_MoneylenderLoans
                  formData={formData}
                  updateField={updateField}
                />
              )}
            </div>

            {/* Floating scroll-to-CTA for review step */}
            {step === 8 && !isBottomCtaVisible && !isLegalModalOpen && (
              <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm">
                <button
                  type="button"
                  onClick={scrollToBottomCta}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] shadow-lg shadow-brand-blue/30"
                >
                  Continue
                </button>
              </div>
            )}

            {/* CTA buttons */}
            <div ref={bottomCtaRef} className="mt-10 sm:mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-12 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] active:scale-[0.98]"
              >
                Back
              </button>

              {step === 8 ? (
                <button
                  type="button"
                  onClick={handleReviewConfirm}
                  disabled={mounted && !canProceed}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Yes, I confirm
                </button>
              ) : step === 9 ? (
                <button
                  type="button"
                  onClick={submitApplication}
                  disabled={(mounted && !canProceed) || !!submitOverlay}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                >
                  {submitOverlay ? "Submitting…" : "Submit Application"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={mounted && !canProceed}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
