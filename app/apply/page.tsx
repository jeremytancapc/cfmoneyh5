"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Step1_LoanDetails,
  Step2_SelfDeclaredIncome,
  Step3_SingpassGate,
  StepIndicator,
} from "@/app/loan-application-form";
import {
  type LoanFormData,
  initialLoanFormData,
  calculateMonthlyRepayment,
} from "@/lib/loan-form";
import { SidebarTrustFeatures } from "@/app/sidebar-trust-features";

export default function ApplyPage() {
  const [history, setHistory] = useState<number[]>([1]);
  const step = history[history.length - 1];

  const [formData, setFormData] = useState<LoanFormData>(initialLoanFormData);
  const [incomeHighWarningShown, setIncomeHighWarningShown] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateField = useCallback(
    <K extends keyof LoanFormData>(key: K, value: LoanFormData[K]) => {
      if (key === "monthlyIncome") setIncomeHighWarningShown(false);
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const monthlyRepayment = useMemo(
    () => calculateMonthlyRepayment(formData.amount, formData.tenure),
    [formData.amount, formData.tenure],
  );

  const sliderPercentage = useMemo(
    () => ((formData.amount - 500) / (30000 - 500)) * 100,
    [formData.amount],
  );

  const canProceed = useMemo(() => {
    const incomeNum = parseInt(formData.monthlyIncome, 10);
    const hasDeclaredIncome =
      formData.monthlyIncome.trim() !== "" &&
      !Number.isNaN(incomeNum) &&
      incomeNum >= 200;
    switch (step) {
      case 1:
        return formData.amount >= 500 && formData.tenure > 0 && formData.urgency !== "";
      case 2:
        return hasDeclaredIncome;
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [step]);

  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const [isBottomCtaVisible, setIsBottomCtaVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  async function saveSessionAndRedirect(
    patch: Partial<LoanFormData>,
    gate: "apply" | "review",
    destination: string,
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/apply/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formData: { ...formData, ...patch }, gate }),
      });
      if (!res.ok) return;
      window.location.assign(destination);
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step === 2) {
      const incomeNum = parseInt(formData.monthlyIncome, 10);
      if (!Number.isNaN(incomeNum) && incomeNum > 20000 && !incomeHighWarningShown) {
        setIncomeHighWarningShown(true);
        return;
      }
    }
    if (step < 3) {
      navigateTo(step + 1);
      scrollToTop();
    }
  }

  function handleBack() {
    if (history.length > 1) {
      setHistory((h) => h.slice(0, -1));
      scrollToTop();
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10">
          <div className="mb-16">
            <Image
              src="/images/cf-money-white.png"
              alt="CF Money"
              width={160}
              height={48}
              className="h-6 w-auto"
              priority
            />
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-[var(--text-on-brand)] max-w-[420px]">
            Get the funds you need, in 8 minutes
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            One simple application. Licensed, regulated, and trusted by over 200,000 Singaporeans since 2011.
          </p>
        </div>
        <SidebarTrustFeatures />
      </aside>

      <main className="flex flex-col flex-1 overflow-x-clip">
        <div className="flex items-center px-6 pb-4 pt-8 lg:hidden">
          <a href="/">
            <Image
              src="/images/cf-money-full-color.png"
              alt="CF Money"
              width={120}
              height={36}
              className="h-4 w-auto"
              priority
            />
          </a>
        </div>

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <StepIndicator current={history.length} total={3} />

            <div key={step} className="animate-slide-in">
              {step === 1 && (
                <Step1_LoanDetails
                  formData={formData}
                  updateField={updateField}
                  monthlyRepayment={monthlyRepayment}
                  sliderPercentage={sliderPercentage}
                  onUrgencySelect={scrollToBottomCta}
                />
              )}
              {step === 2 && (
                <Step2_SelfDeclaredIncome
                  formData={formData}
                  updateField={updateField}
                  incomeHighWarningShown={incomeHighWarningShown}
                />
              )}
              {step === 3 && (
                <Step3_SingpassGate
                  onBack={handleBack}
                  onSingpass={() => {
                    saveSessionAndRedirect({ authMethod: "singpass" }, "apply", "/api/auth");
                  }}
                  onManual={() => {
                    saveSessionAndRedirect({ authMethod: "manual" }, "apply", "/apply/review");
                  }}
                  redirectPending={saving}
                />
              )}
            </div>

            {step !== 3 && (
              <>
                {step === 1 && !isBottomCtaVisible && (
                  <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm">
                    <button
                      type="button"
                      onClick={scrollToBottomCta}
                      disabled={mounted && !canProceed}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Continue
                    </button>
                  </div>
                )}

                <div ref={bottomCtaRef} className="mt-10 sm:mt-8 flex items-center gap-3">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex h-12 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] active:scale-[0.98]"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={(mounted && !canProceed) || saving}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {saving ? "Please wait…" : "Continue"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
