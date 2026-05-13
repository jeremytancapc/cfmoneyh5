"use client";

import Image from "next/image";
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { LoanFormData as FormData } from "@/lib/loan-form";
import { initialLoanFormData as initialFormData, calculateMonthlyRepayment, formatCurrency } from "@/lib/loan-form";
import { createPortal } from "react-dom";
import { LoanLoadingScreen } from "./loan-loading-screen";
import { LoanResults } from "./loan-results";
import { AppointmentBooking } from "./appointment-booking";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  CurrencyDollar,
  User,
  Briefcase,
  Phone,
  ChatTeardropText,
  IdentificationCard,
  Buildings,
  ChartLineUp,
  Lock,
  Fingerprint,
  Coins,
  MagnifyingGlass,
  Plus,
  Minus,
  CaretDown,
  Warning,
  WarningCircle,
  ArrowDown,
  X,
  WhatsappLogo,
  PencilSimple,
  Check,
} from "@phosphor-icons/react";

/** 1–2: loan + income · 3: Singpass vs manual · 4: identity · 8: review · 5: contact · 7: bankruptcy · 9: moneylender loans */
const TOTAL_STEPS = 8; // review is still at internal step 8

const TENURE_OPTIONS = [1, 3, 6, 9, 12, 18, 24];

const URGENCY_OPTIONS = [
  { value: "today", label: "Today", emoji: "⚡" },
  { value: "this_week", label: "This Week", emoji: "📅" },
  { value: "not_sure", label: "Flexible", emoji: "🔄" },
] as const;

const ID_TYPE_OPTIONS = [
  { value: "singaporean", label: "Singaporean" },
  { value: "pr", label: "Singapore PR" },
  { value: "foreigner", label: "Foreigner" },
] as const;

const EMPLOYMENT_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "self_employed", label: "Self-employed" },
  { value: "part_time_freelance", label: "Part-time / freelance" },
  { value: "platform_worker", label: "Platform worker (PHV/delivery)" },
] as const;

const LOAN_PURPOSE_OPTIONS = [
  { value: "personal", label: "Personal Expenses" },
  { value: "medical", label: "Medical" },
  { value: "renovation", label: "Renovation" },
  { value: "education", label: "Education" },
  { value: "business", label: "Business" },
  { value: "debt_consolidation", label: "Debt Consolidation" },
  { value: "other", label: "Other" },
] as const;

const INDUSTRY_OPTIONS = [
  { value: "households", label: "Activities of Households as Employers of Domestic Personnel" },
  { value: "mining", label: "Mining and Quarrying" },
  { value: "not_defined", label: "Activities Not Adequately Defined" },
  { value: "education", label: "Education" },
  { value: "finance_insurance", label: "Financial and Insurance Activities" },
  { value: "real_estate", label: "Real Estate Activities" },
  { value: "admin_support", label: "Administrative and Support Service Activities" },
  { value: "construction", label: "Construction" },
  { value: "agriculture", label: "Agriculture and Fishing" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "ict", label: "Information and Communications" },
  { value: "water_waste", label: "Water Supply, Sewerage, Waste Management and Remediation Activities" },
  { value: "extraterritorial", label: "Activities of Extra-Territorial Organisations and Bodies" },
  { value: "professional", label: "Professional, Scientific and Technical Activities" },
  { value: "wholesale_retail", label: "Wholesale and Retail Trade" },
  { value: "electricity_gas", label: "Electricity, Gas, Steam and Air Conditioning Supply" },
  { value: "health_social", label: "Health and Social Services" },
  { value: "public_admin", label: "Public Administration and Defence" },
  { value: "accommodation_food", label: "Accommodation and Food Service Activities" },
  { value: "transport_storage", label: "Transportation and Storage" },
  { value: "other_services", label: "Other Service Activities" },
  { value: "arts_entertainment", label: "Arts, Entertainment and Recreation" },
] as const;

const POSITION_OPTIONS = [
  { value: "director_senior_exec", label: "Director / Senior Executive" },
  { value: "manager", label: "Manager / Assistant Manager" },
  { value: "junior_executive", label: "Junior Executive" },
  { value: "others", label: "Others" },
] as const;

const EMPLOYMENT_DURATION_OPTIONS = [
  { value: "less_1y", label: "Less than 1 year" },
  { value: "1_3y", label: "1 – 3 years" },
  { value: "4_7y", label: "4 – 7 years" },
  { value: "8_10y", label: "8 – 10 years" },
  { value: "10y_plus", label: "10 years and above" },
] as const;

const PAYMENT_HISTORY_OPTIONS = [
  { value: "bad_debt", label: "Missed payments", emoji: "😰" },
  { value: "average", label: "Average", emoji: "😐" },
  { value: "on_time", label: "On-time", emoji: "😁" },
] as const;

export function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-5 sm:mb-6">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isCompleted = step < current;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className="relative flex items-center justify-center transition-all duration-300"
              style={{
                width: isActive ? 32 : 8,
                height: 8,
                borderRadius: 4,
                background: isCompleted
                  ? "var(--brand-teal-hex)"
                  : isActive
                    ? "var(--brand-blue-hex)"
                    : "var(--border-subtle)",
              }}
            />
          </div>
        );
      })}
      <span className="ml-auto text-xs font-medium text-[var(--text-tertiary)] tabular-nums">
        {current} / {total}
      </span>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"; className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile: icon inline with heading */}
      <div className="flex items-center gap-3 sm:block">
        <div className="shrink-0 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-blue/[0.06] sm:mb-3">
          <Icon size={18} weight="duotone" className="text-brand-blue sm:hidden" />
          <Icon size={22} weight="duotone" className="text-brand-blue hidden sm:block" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
      </div>
      <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)] max-w-[42ch] sm:max-w-none">
        {subtitle}
      </p>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  prefix,
  helper,
  tooltip,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  prefix?: string;
  helper?: string;
  tooltip?: React.ReactNode;
}) {
  const [tipVisible, setTipVisible] = useState(false);
  const [tipPos, setTipPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const clickRef = useRef(false);

  function calcPos() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setTipPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }

  function handleMouseEnter() {
    hoverRef.current = true;
    calcPos();
    setTipVisible(true);
  }

  function handleMouseLeave() {
    hoverRef.current = false;
    if (!clickRef.current) setTipVisible(false);
  }

  function handleClick() {
    clickRef.current = !clickRef.current;
    if (clickRef.current) {
      calcPos();
      setTipVisible(true);
    } else if (!hoverRef.current) {
      setTipVisible(false);
    }
  }

  useEffect(() => {
    if (!tipVisible) return;
    const handler = (e: MouseEvent) => {
      if (
        !tipRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        clickRef.current = false;
        setTipVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tipVisible]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-base font-medium text-[var(--text-primary)]">
          {label}
        </label>
        {tooltip && (
          <>
            <button
              ref={btnRef}
              type="button"
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand-blue/30 bg-white text-[10px] font-bold text-brand-blue shadow-sm transition-colors duration-150 hover:bg-brand-blue/5 focus:outline-none"
              aria-label="More information"
            >
              ?
            </button>
            {tipVisible && createPortal(
              <div
                ref={tipRef}
                style={{
                  position: "fixed",
                  top: tipPos.top,
                  right: tipPos.right,
                  zIndex: 9999,
                  width: "18rem",
                  maxWidth: "calc(100vw - 2.5rem)",
                }}
                className="rounded-[var(--radius-md)] bg-gray-900 p-3.5 shadow-2xl"
              >
                <div
                  style={{ position: "absolute", top: -6, right: 6 }}
                  className="h-3 w-3 rotate-45 bg-gray-900"
                />
                {tooltip}
              </div>,
              document.body
            )}
          </>
        )}
      </div>
      <div
        className={`flex min-h-[40px] sm:min-h-[46px] items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] transition-all duration-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 ${
          prefix ? "gap-2 pl-4 pr-4" : ""
        }`}
      >
        {prefix && (
          <span className="shrink-0 select-none text-sm text-[var(--text-tertiary)]">
            {prefix}
          </span>
        )}
        <input
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-tertiary)] ${
            prefix ? "py-2 sm:py-3 pl-0" : "px-4 py-2 sm:py-3"
          }`}
        />
      </div>
      {helper && (
        <span className="text-xs text-[var(--text-tertiary)]">{helper}</span>
      )}
    </div>
  );
}

function SelectableChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium transition-all duration-200"
      style={{
        borderColor: selected
          ? "var(--brand-blue-hex)"
          : "var(--border-subtle)",
        background: selected ? "oklch(0.32 0.14 260 / 0.06)" : "transparent",
        color: selected
          ? "var(--brand-blue-hex)"
          : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

type PostSubmitPhase = "form" | "loading" | "results" | "booking";

export function LoanApplicationForm({
  reminderItems = [],
  thingsToBring = [],
}: {
  reminderItems?: string[];
  thingsToBring?: string[];
}) {
  // Navigation history stack — Back always pops, so non-linear jumps (e.g.
  // Singpass skipping steps 4-7) are correctly unwound on Back.
  const [history, setHistory] = useState<number[]>([1]);
  const step = history[history.length - 1];

  const navigateTo = useCallback((next: number) => {
    setHistory((h) => [...h, next]);
  }, []);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [postSubmitPhase, setPostSubmitPhase] = useState<PostSubmitPhase>("form");
  const [incomeHighWarningShown, setIncomeHighWarningShown] = useState(false);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      if (key === "monthlyIncome") setIncomeHighWarningShown(false);
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const monthlyRepayment = useMemo(
    () => calculateMonthlyRepayment(formData.amount, formData.tenure),
    [formData.amount, formData.tenure],
  );

  const canProceed = useMemo(() => {
    const incomeNum = parseInt(formData.monthlyIncome, 10);
    const hasDeclaredIncome =
      formData.monthlyIncome.trim() !== "" &&
      !Number.isNaN(incomeNum) &&
      incomeNum >= 200;

    switch (step) {
      case 1:
        return (
          formData.amount >= 500 &&
          formData.tenure > 0 &&
          formData.urgency !== ""
        );
      case 2:
        return hasDeclaredIncome;
      case 3:
        return false;
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
          rawAmount.trim() !== "" &&
          !Number.isNaN(parseInt(rawAmount, 10));
        return (
          formData.moneylenderNoLoans === true ||
          (hasAmount && (formData.moneylenderPaymentHistory ?? "") !== "")
        );
      }
      default:
        return false;
    }
  }, [step, formData]);

  // Scroll to top after every step/phase change, once new content is in the DOM.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [step, postSubmitPhase]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const [isBottomCtaVisible, setIsBottomCtaVisible] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [step3RedirectPending, setStep3RedirectPending] = useState(false);

  const leaveAfterSavingGate = useCallback(
    async (destination: string, patch: Partial<FormData>) => {
      setStep3RedirectPending(true);
      try {
        const res = await fetch("/api/apply/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            formData: { ...formData, ...patch },
            gate: "apply",
          }),
        });
        if (!res.ok) {
          setStep3RedirectPending(false);
          return;
        }
        window.location.assign(destination);
      } catch {
        setStep3RedirectPending(false);
      }
    },
    [formData],
  );

  useEffect(() => {
    const el = bottomCtaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsBottomCtaVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [step]);

  const scrollToBottomCta = useCallback(() => {
    const el = bottomCtaRef.current;
    if (!el) return;
    const start = window.scrollY;
    const rawTarget = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + el.offsetHeight / 2;
    // Clamp to the true max scroll so we never ask the browser to scroll past
    // the document bottom — on mobile Android this can expand the document and
    // leave a permanent white gap below the footer.
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.max(0, Math.min(rawTarget, maxScroll));
    const distance = target - start;
    if (Math.abs(distance) < 2) return;
    const duration = 500;
    let startTime: number | null = null;
    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + distance * easeInOut(progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const handleSubmit = useCallback(() => {
    setPostSubmitPhase("loading");
    scrollToTop();
  }, [scrollToTop]);

  const handleNext = useCallback(() => {
    if (step === 2) {
      const incomeNum = parseInt(formData.monthlyIncome, 10);
      if (!Number.isNaN(incomeNum) && incomeNum > 20000 && !incomeHighWarningShown) {
        setIncomeHighWarningShown(true);
        return;
      }
    }
    // After identity (step 4), jump straight to review
    if (step === 4) {
      navigateTo(8);
      scrollToTop();
      return;
    }
    // Post-review: contact → bankruptcy
    if (step === 5 && history.includes(8)) {
      navigateTo(7);
      scrollToTop();
      return;
    }
    // Post-review: bankruptcy → moneylender loans
    if (step === 7 && history.includes(8)) {
      navigateTo(9);
      scrollToTop();
      return;
    }
    // Moneylender loans → submit
    if (step === 9) {
      handleSubmit();
      return;
    }
    if (step < TOTAL_STEPS) { navigateTo(step + 1); scrollToTop(); }
  }, [step, formData.monthlyIncome, incomeHighWarningShown, history, navigateTo, scrollToTop, handleSubmit]);

  const handleBack = useCallback(() => {
    // Pop the history stack so Back always returns to where the user actually
    // came from, including non-linear jumps (e.g. Singpass skipping steps 4-7).
    if (history.length > 1) {
      setHistory((h) => h.slice(0, -1));
      scrollToTop();
    }
  }, [history, scrollToTop]);

  const handleLoadingComplete = useCallback(() => {
    setPostSubmitPhase("results");
    scrollToTop();
  }, [scrollToTop]);

  const handleAcceptOffer = useCallback(() => {
    setPostSubmitPhase("booking");
    scrollToTop();
  }, [scrollToTop]);

  // Display step = position in the journey (history length), not the internal step number.
  // Singpass path: 1→2→3→review→contact→bankruptcy→moneylender = 7 steps
  // Manual path:   1→2→3→identity→review→contact→bankruptcy→moneylender = 8 steps
  const displayStep = history.length;
  const displayTotal = useMemo(() => {
    if (formData.authMethod === "singpass") return 7;
    return 8; // manual or not yet chosen
  }, [formData.authMethod]);

  const sliderPercentage = useMemo(() => {
    return ((formData.amount - 500) / (20000 - 500)) * 100;
  }, [formData.amount]);

  if (postSubmitPhase === "loading") {
    return <LoanLoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (postSubmitPhase === "results") {
    return (
      <LoanResults
        formData={formData}
        monthlyRepayment={monthlyRepayment}
        onAccept={handleAcceptOffer}
        reminderItems={reminderItems}
      />
    );
  }

  if (postSubmitPhase === "booking") {
    return <AppointmentBooking formData={formData} onBack={() => { setPostSubmitPhase("results"); scrollToTop(); }} thingsToBring={thingsToBring} />;
  }

  return (
    <div>
      <StepIndicator current={displayStep} total={displayTotal} />

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
            onBack={() => {
              setStep3RedirectPending(false);
              setHistory((h) => h.slice(0, -1));
              scrollToTop();
            }}
            onSingpass={() => {
              void leaveAfterSavingGate("/api/auth", { authMethod: "singpass" });
            }}
            onManual={() => {
              void leaveAfterSavingGate("/apply/review", { authMethod: "manual" });
            }}
            redirectPending={step3RedirectPending}
          />
        )}
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

      {/* ── Floating Continue button — outside animate-slide-in so fixed works ── */}
      {step === 8 && !isBottomCtaVisible && !isLegalModalOpen && (
        <>
          {/* Mobile: full-width pill */}
          <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm">
            <button
              type="button"
              onClick={scrollToBottomCta}
            disabled={mounted && !canProceed}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              Continue
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>

          {/* Desktop: circle arrow button bottom-right */}
          <button
            type="button"
            onClick={scrollToBottomCta}
            disabled={mounted && !canProceed}
            className="hidden lg:flex fixed bottom-8 right-8 z-40 h-12 w-12 items-center justify-center rounded-full bg-brand-blue shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:brightness-110 active:scale-[0.95] disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Scroll to continue"
          >
            <ArrowDown size={20} weight="bold" className="text-[var(--text-on-brand)]" />
          </button>
        </>
      )}

      {step !== 3 && (
        <>
        <div ref={bottomCtaRef} className="mt-10 sm:mt-8 flex items-center gap-3 relative z-20">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-12 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] active:scale-[0.98]"
            >
              <ArrowLeft size={16} weight="bold" />
              Back
            </button>
          )}

          {step === TOTAL_STEPS ? (
            // Review page — "Yes, I confirm" leads into contact → bankruptcy → moneylender → submit
            <button
              type="button"
              onClick={() => { navigateTo(5); scrollToTop(); }}
              disabled={mounted && !canProceed}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              <ShieldCheck size={18} weight="bold" />
              Yes, I confirm
            </button>
          ) : step === 9 ? (
            // Moneylender loans — final submit
            <button
              type="button"
              onClick={handleNext}
              disabled={mounted && !canProceed}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              <ShieldCheck size={18} weight="bold" />
              Submit Application
            </button>
          ) : step === 7 && history.includes(8) ? (
            // Post-review bankruptcy step — next (goes to moneylender loans)
            <button
              type="button"
              onClick={handleNext}
              disabled={mounted && !canProceed}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
              <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={mounted && !canProceed}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              Continue
              <ArrowRight size={16} weight="bold" />
            </button>
          )}
        </div>
        {step === 9 && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--text-tertiary)]">
            *Declared history may affect the final disbursed amount.
          </p>
        )}
        </>
      )}
    </div>
  );
}

export function Step1_LoanDetails({
  formData,
  updateField,
  monthlyRepayment,
  sliderPercentage,
  onUrgencySelect,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  monthlyRepayment: number;
  sliderPercentage: number;
  onUrgencySelect?: () => void;
}) {
  const [amountRaw, setAmountRaw] = useState(String(formData.amount));
  const [amountFocused, setAmountFocused] = useState(false);
  const [tenureRaw, setTenureRaw] = useState(String(formData.tenure));
  const [tenureFocused, setTenureFocused] = useState(false);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      setAmountRaw(raw);
      const num = parseInt(raw, 10);
      if (!Number.isNaN(num) && num >= 500 && num <= 20000) {
        updateField("amount", num);
      }
    },
    [updateField],
  );

  const handleAmountBlur = useCallback(() => {
    setAmountFocused(false);
    const num = parseInt(amountRaw, 10);
    const clamped = Number.isNaN(num)
      ? 500
      : Math.round(Math.min(Math.max(num, 500), 20000) / 500) * 500;
    updateField("amount", clamped);
    setAmountRaw(String(clamped));
  }, [amountRaw, updateField]);

  const handleTenureBlur = useCallback(() => {
    setTenureFocused(false);
    const num = parseInt(tenureRaw, 10);
    if (Number.isNaN(num) || num <= 0) { setTenureRaw(String(formData.tenure)); return; }
    const clamped = Math.min(Math.max(num, 1), 24);
    updateField("tenure", clamped);
    setTenureRaw(String(clamped));
  }, [tenureRaw, formData.tenure, updateField]);


  return (
    <div>
      <StepHeader
        icon={CurrencyDollar}
        title="How much do you need?"
        subtitle="Your personalised limit is confirmed on the next step."
      />

      <div className="flex flex-col gap-5 sm:gap-6">
        <div>
          <div className="mb-1 flex items-end justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">Loan Amount</label>
            <div
              className="flex items-baseline gap-0.5 border-b-2 pb-0.5 transition-colors duration-150"
              style={{ borderColor: amountFocused ? "var(--brand-blue-hex)" : "var(--border-medium)" }}
            >
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-brand-blue">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountFocused ? amountRaw : `${formData.amount.toLocaleString("en-SG")}${formData.amount >= 20000 ? "+" : ""}`}
                onFocus={() => { setAmountFocused(true); setAmountRaw(String(formData.amount)); }}
                onBlur={handleAmountBlur}
                onChange={handleAmountChange}
                className="min-w-0 border-0 bg-transparent text-right font-display text-xl sm:text-2xl font-bold tracking-tight text-brand-blue tabular-nums outline-none"
                style={{ width: `${Math.max(amountFocused ? amountRaw.length : formData.amount.toLocaleString("en-SG").length, 3)}ch` }}
                aria-label="Loan amount"
              />
            </div>
          </div>
          <div className="relative">
            <div
              className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full"
              style={{
                width: `${sliderPercentage}%`,
                background: "var(--brand-blue-hex)",
              }}
            />
            <input
              type="range"
              min={500}
              max={20000}
              step={500}
              value={formData.amount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateField("amount", val);
                setAmountRaw(String(val));
              }}
              className="relative z-10 w-full cursor-pointer"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>$500</span>
            <span>$20,000+</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-end justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Loan Tenure
            </label>
            <div
              className="flex items-baseline gap-1.5 border-b-2 pb-0.5 transition-colors duration-150"
              style={{ borderColor: tenureFocused ? "var(--brand-blue-hex)" : "var(--border-medium)" }}
            >
              <input
                type="text"
                inputMode="numeric"
                value={tenureFocused ? tenureRaw : String(formData.tenure)}
                onFocus={() => { setTenureFocused(true); setTenureRaw(String(formData.tenure)); }}
                onBlur={handleTenureBlur}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setTenureRaw(raw);
                }}
                className="min-w-0 border-0 bg-transparent text-right font-display text-xl sm:text-2xl font-bold tracking-tight text-brand-blue tabular-nums outline-none"
                style={{ width: `${Math.max((tenureFocused ? tenureRaw : String(formData.tenure)).length, 2)}ch` }}
                aria-label="Loan tenure in months"
              />
              <span className="text-base sm:text-lg font-semibold text-brand-blue">months</span>
            </div>
          </div>
          <div className="relative">
            <div
              className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full"
              style={{
                width: `${((formData.tenure - 1) / (24 - 1)) * 100}%`,
                background: "var(--brand-blue-hex)",
              }}
            />
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={formData.tenure}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateField("tenure", val);
                setTenureRaw(String(val));
              }}
              className="relative z-10 w-full cursor-pointer"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>1 month</span>
            <span>24 months+</span>
          </div>
        </div>

        <div>
          <div
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3 flex items-center justify-between gap-3"
            style={{ boxShadow: "3px 3px 0px 0px var(--brand-blue-hex)" }}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-primary)]">
              Monthly repayment
            </span>
            <div className="flex items-baseline gap-0.5 shrink-0">
              <span className="font-display text-xl font-bold tracking-tight text-brand-blue tabular-nums">
                {formatCurrency(monthlyRepayment)}*
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">/mo</span>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
            *Estimate only. Maybe lower based on your credit score.
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
            When do you need the funds?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_OPTIONS.map(({ value, label, emoji }) => {
              const isSelected = formData.urgency === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    updateField("urgency", value);
                    onUrgencySelect?.();
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border py-2.5 sm:py-4 transition-all duration-200 active:scale-[0.96]"
                  style={{
                    borderColor: isSelected
                      ? "var(--brand-blue-hex)"
                      : "var(--border-subtle)",
                    background: isSelected
                      ? "var(--brand-blue-hex)"
                      : "transparent",
                  }}
                >
                  <span className="text-[22px] leading-none" aria-hidden="true">{emoji}</span>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isSelected
                        ? "var(--text-on-brand)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step2_SelfDeclaredIncome({
  formData,
  updateField,
  incomeHighWarningShown,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  incomeHighWarningShown: boolean;
}) {
  const [touched, setTouched] = useState(false);

  const incomeNum = parseInt(formData.monthlyIncome, 10);
  const hasValue = formData.monthlyIncome.trim() !== "" && !Number.isNaN(incomeNum);
  const isTooLow = touched && hasValue && incomeNum < 200;
  const isHighIncome = hasValue && incomeNum > 20000;

  return (
    <div>
      <StepHeader
        icon={Coins}
        title="What is your monthly income?"
        subtitle="This helps us confirm the loan is within your budget."
      />
      <div className="flex flex-col gap-5">
        <InputField
          label="Estimated Gross Monthly Income"
          type="number"
          placeholder="e.g. 4500"
          value={formData.monthlyIncome}
          onChange={(v) => { setTouched(false); updateField("monthlyIncome", v); }}
          onBlur={() => setTouched(true)}
          prefix="$"
          helper=""
          tooltip={
            <ol className="space-y-2.5">
              <li className="text-sm leading-snug text-white/70">
                <span className="font-semibold text-white">Employed Full-time — </span>
                Gross monthly salary before CPF deduction
              </li>
              <li className="text-sm leading-snug text-white/70">
                <span className="font-semibold text-white">PHV drivers — </span>
                Gross monthly salary after deducting vehicle rental fees
              </li>
              <li className="text-sm leading-snug text-white/70">
                <span className="font-semibold text-white">Own business — </span>
                Monthly salary based on latest year Notice of Assessment or monthly bank statement
              </li>
            </ol>
          }
        />

        {isTooLow && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 leading-snug">
              Our minimum income requirement is <span className="font-semibold">$200/month</span>.
            </p>
          </div>
        )}

        {isHighIncome && incomeHighWarningShown && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800 leading-snug">
              Just double checking your income is entered correctly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Step3_SingpassGate({
  onBack,
  onSingpass,
  onManual,
  redirectPending = false,
}: {
  onBack: () => void;
  onSingpass: () => void;
  onManual: () => void;
  /** When true, disables actions while session is saved and browser navigates away. */
  redirectPending?: boolean;
}) {
  const benefits = [
    "No documents submission required",
    "Increases approval rate to up to 90%",
    "Your data is safe and will only be used for this application.",
  ];

  return (
    <div className="py-4 sm:py-6">
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
        Get Approved Quicker{" "}
        <span className="inline-block animate-float">⚡</span>
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:whitespace-nowrap">
        Verify with Singpass for higher approval rates and faster processing.
      </p>

      <ul className="mt-7 flex flex-col gap-3.5">
        {benefits.map((text) => (
          <li key={text} className="flex items-start gap-2.5">
            <CheckCircle
              size={16}
              weight="duotone"
              className="mt-0.5 shrink-0 text-brand-teal"
            />
            <span className="text-sm text-[var(--text-secondary)]">{text}</span>
          </li>
        ))}
      </ul>

      {redirectPending ? (
        <div className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#E3001B] text-sm font-medium text-white">
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          Please wait…
        </div>
      ) : (
        <button
          type="button"
          onClick={onSingpass}
          disabled={redirectPending}
          className="mt-6 flex w-full justify-center active:scale-[0.98] transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Retrieve Myinfo with Singpass"
        >
          <Image
            src="/images/singpass-myinfo-red.png"
            alt="Retrieve Myinfo with Singpass"
            width={320}
            height={56}
            className="h-12 w-auto rounded-[var(--radius-md)]"
            priority
          />
        </button>
      )}

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-subtle)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--surface-primary)] px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            or
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={redirectPending}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>
        <button
          type="button"
          onClick={onManual}
          disabled={redirectPending}
          className="flex items-center gap-2 text-sm font-semibold text-brand-blue transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {redirectPending ? "Please wait…" : "Fill in manually"}
          {!redirectPending && <ArrowRight size={16} weight="bold" />}
        </button>
      </div>
    </div>
  );
}

export function Step4_Identity({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={IdentificationCard}
        title="Tell us about yourself"
        subtitle="We need this to verify your identity and eligibility."
      />

      <div className="flex flex-col gap-3 sm:gap-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            I am a
          </label>
          <div className="flex flex-wrap gap-2">
            {ID_TYPE_OPTIONS.map(({ value, label }) => (
              <SelectableChip
                key={value}
                label={label}
                selected={formData.idType === value}
                onClick={() => updateField("idType", value)}
              />
            ))}
          </div>
        </div>

        <InputField
          label="Full Name (as per NRIC)"
          placeholder="e.g. Tan Wei Ming"
          value={formData.fullName}
          onChange={(v) => updateField("fullName", v)}
        />

        <InputField
          label="NRIC / FIN Number"
          placeholder="e.g. S1234567D"
          value={formData.nric}
          onChange={(v) => updateField("nric", v.toUpperCase())}
          helper="Your NRIC is encrypted and never shared with third parties."
        />
      </div>
    </div>
  );
}

function Step5_Employment({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  const declared =
    formData.monthlyIncome.trim() !== ""
      ? formatCurrency(parseInt(formData.monthlyIncome, 10) || 0)
      : "—";

  return (
    <div>
      <StepHeader
        icon={Briefcase}
        title="Employment details"
        subtitle="Tell us how you currently earn your income."
      />

      <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-brand-blue/[0.04] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
          Self-declared monthly income
        </p>
        <p className="mt-1 font-display text-lg font-bold tabular-nums text-brand-blue">
          {declared}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
            Employment Status
          </label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_OPTIONS.map(({ value, label }) => (
              <SelectableChip
                key={value}
                label={label}
                selected={formData.employmentStatus === value}
                onClick={() => updateField("employmentStatus", value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step6_Contact({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={Phone}
        title="How can we reach you?"
        subtitle="We'll contact you regarding your loan status and details."
      />

      <div className="flex flex-col gap-5">
        {/* Mobile number field */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-base font-medium text-[var(--text-primary)]">
              WhatsApp Mobile Number
            </label>
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: "#25D366" }}
            >
              <WhatsappLogo size={13} weight="fill" className="text-white" />
            </div>
          </div>
          <div className="flex min-h-[40px] sm:min-h-[46px] items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] gap-2 pl-4 pr-4 transition-all duration-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10">
            <span className="shrink-0 select-none text-sm text-[var(--text-tertiary)]">+65</span>
            <input
              type="tel"
              placeholder="9123 4567"
              value={formData.mobile}
              onChange={(e) => updateField("mobile", e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent py-2 sm:py-3 pl-0 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step7_Additional({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={Buildings}
        title="A few more details"
        subtitle="Almost done. This helps us finalise your application."
      />

      <div className="flex flex-col gap-5">
        <InputField
          label="Residential Address"
          placeholder="Block, Street, Unit"
          value={formData.address}
          onChange={(v) => updateField("address", v)}
        />

        <InputField
          label="Postal Code"
          type="text"
          placeholder="e.g. 520123"
          value={formData.postalCode}
          onChange={(v) => updateField("postalCode", v)}
        />
      </div>
    </div>
  );
}

// ── SearchableSelect ────────────────────────────────────────────────────────

function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <label className="text-base font-medium text-[var(--text-primary)]">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setQuery("");
          }}
          className="flex h-[46px] w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm transition-all duration-200 focus-visible:outline-none"
          style={{
            borderColor: open ? "var(--brand-blue-hex)" : undefined,
            boxShadow: open ? "0 0 0 2px oklch(0.32 0.14 260 / 0.10)" : undefined,
          }}
        >
          <span
            className={value ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 28px)", textAlign: "left" }}
          >
            {value ? selectedLabel : placeholder}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--text-tertiary)] transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_8px_24px_-4px_rgba(0,0,51,0.12)]"
            style={{ overflow: "hidden" }}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5">
              <MagnifyingGlass size={14} className="shrink-0 text-[var(--text-tertiary)]" />
              <input
                autoFocus
                type="text"
                placeholder="Type to filter..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="shrink-0 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Options list */}
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">No results</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors duration-100"
                    style={{
                      background: opt.value === value ? "oklch(0.32 0.14 260 / 0.06)" : "transparent",
                      color: opt.value === value ? "var(--brand-blue-hex)" : "var(--text-secondary)",
                      fontWeight: opt.value === value ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ lineHeight: 1.4 }}>{opt.label}</span>
                    {opt.value === value && (
                      <CheckCircle size={14} weight="fill" className="shrink-0 ml-2" style={{ color: "var(--brand-blue-hex)" }} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step9_EmploymentDeclaration ──────────────────────────────────────────────

function Step9_EmploymentDeclaration({
  formData,
  updateField,
  onBankruptcyClear,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  onBankruptcyClear?: () => void;
}) {
  const CARDS = 4;

  const [activeCard, setActiveCard] = useState(0);

  // exitingCard tracks which card is currently flying off-screen.
  // Setting activeCard and exitingCard simultaneously means both cards
  // animate in parallel — zero pause between exit and entrance.
  const [exitingCard, setExitingCard] = useState<number | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardTitles = [
    "Employment Status",
    "Job Position",
    "Time at Current Job",
    "Bankruptcy & DRS Status",
  ];

  function advanceTo(next: number) {
    if (next >= CARDS) return;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setExitingCard(activeCard);
    setActiveCard(next);
    exitTimerRef.current = setTimeout(() => setExitingCard(null), 450);
  }

  function goBack() {
    if (activeCard === 0) return;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setExitingCard(activeCard);
    setActiveCard((c) => c - 1);
    exitTimerRef.current = setTimeout(() => setExitingCard(null), 450);
  }

  React.useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Render full content for the active card and the card that's mid-exit animation
  function showContent(index: number): boolean {
    return index === activeCard || index === exitingCard;
  }

  // Compute per-card CSS transform based on its role
  function cardStyle(index: number): React.CSSProperties {
    const spring = "transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease";

    if (index === exitingCard) {
      return {
        // No rotate — rotation causes the card's bounding box to extend below the
        // container, which expands Android Chrome's scroll area and leaves a
        // permanent white gap below the footer.
        transform: "translateX(115%)",
        opacity: 0,
        transition: spring,
        zIndex: 11,
        pointerEvents: "none",
      };
    }

    if (index === activeCard) {
      return {
        transform: "translateX(0) scale(1) translateY(0px)",
        opacity: 1,
        transition: spring,
        zIndex: 10,
        pointerEvents: "auto",
      };
    }

    if (index < activeCard) {
      // Already-answered — off-screen right, no transition (instant)
      return {
        transform: "translateX(115%)",
        opacity: 0,
        transition: "none",
        zIndex: 9 - (activeCard - index),
        pointerEvents: "none",
      };
    }

    // Cards behind (index > activeCard) — stacked depth effect
    const depth = index - activeCard;
    return {
      transform: `translateY(${depth * 8}px) scale(${1 - depth * 0.04})`,
      opacity: 1 - depth * 0.2,
      transition: spring,
      zIndex: 9 - depth,
      pointerEvents: "none",
    };
  }

  // Background / border for a card based on whether it's the active front card
  function cardBg(index: number): React.CSSProperties {
    const isFront = showContent(index);
    if (isFront) {
      return {
        background: "var(--brand-blue-hex)",
        borderColor: "transparent",
        boxShadow: [
          "0 2px 4px oklch(0.18 0.16 260 / 0.18)",
          "0 8px 16px oklch(0.22 0.16 260 / 0.28)",
          "0 20px 40px oklch(0.26 0.14 260 / 0.36)",
          "0 40px 64px oklch(0.18 0.12 260 / 0.22)",
          "inset 0 1px 0 oklch(1 0 0 / 0.12)",
        ].join(", "),
      };
    }
    // Behind cards — neutral, same fixed height so none peek out
    return {
      background: "var(--surface-elevated)",
      borderColor: "var(--border-subtle)",
      boxShadow: "0 4px 12px oklch(0 0 0 / 0.10), 0 1px 3px oklch(0 0 0 / 0.08)",
      minHeight: "80px",
      overflow: "hidden",
    };
  }

  const isBankruptcyClearSelected = formData.bankruptcyDeclaration === "clear";
  const isBankruptcyDischargedSelected = formData.bankruptcyDeclaration === "discharged_lt5";
  const isBankruptcyActiveSelected = formData.bankruptcyDeclaration === "active";

  // Measure the active card's real DOM height so the container hugs it exactly.
  const cardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const [containerHeight, setContainerHeight] = useState(220);

  React.useEffect(() => {
    const el = cardRefs.current[activeCard];
    if (el) setContainerHeight(el.offsetHeight);
  }, [activeCard, formData.bankruptcyDeclaration]);

  return (
    <div>
      <StepHeader
        icon={Briefcase}
        title="Employment details"
        subtitle="A few final questions before we process your application."
      />

      {/* Progress dots + contextual action */}
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: CARDS }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeCard ? "24px" : "6px",
                background: i < activeCard
                  ? "var(--brand-teal-hex)"
                  : i === activeCard
                    ? "var(--brand-blue-hex)"
                    : "var(--border-medium)",
                opacity: i > activeCard ? 0.4 : 1,
              }}
            />
          ))}
          <span className="ml-1 text-xs text-[var(--text-tertiary)]">
            {activeCard + 1} of {CARDS}
          </span>
        </div>

      </div>

      {/* Card stack container */}
      <div
        className="relative w-full"
        style={{ height: `${containerHeight}px`, transition: "height 0.4s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* ── Card 0: Employment Status ── */}
        <div
          ref={(el) => { cardRefs.current[0] = el; }}
          className="absolute inset-x-0 top-0 rounded-[var(--radius-lg)] border px-5 py-5"
          style={{ ...cardStyle(0), ...cardBg(0) }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="truncate min-w-0 text-base font-bold text-white">{cardTitles[0]}</span>
            <span className="whitespace-nowrap shrink-0 text-xs text-white/60">Select one</span>
          </div>
          {showContent(0) && (
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_OPTIONS.map(({ value, label }) => {
                const isSelected = formData.employmentStatus === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={activeCard !== 0 || exitingCard !== null}
                    onClick={() => {
                      updateField("employmentStatus", value);
                      setTimeout(() => advanceTo(1), 320);
                    }}
                    className="rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97]"
                    style={{
                      borderColor: isSelected ? "white" : "rgba(255,255,255,0.3)",
                      background: isSelected ? "white" : "rgba(255,255,255,0.12)",
                      color: isSelected ? "var(--brand-blue-hex)" : "white",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Card 1: Job Position ── */}
        <div
          ref={(el) => { cardRefs.current[1] = el; }}
          className="absolute inset-x-0 top-0 rounded-[var(--radius-lg)] border px-5 py-5"
          style={{ ...cardStyle(1), ...cardBg(1) }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className={`truncate min-w-0 text-base font-bold ${showContent(1) ? "text-white" : "text-[var(--text-primary)]"}`}>{cardTitles[1]}</span>
            {showContent(1) && <span className="whitespace-nowrap shrink-0 text-xs text-white/60">Select one</span>}
          </div>
          {showContent(1) && (
            <div className="flex flex-wrap gap-2">
              {POSITION_OPTIONS.map(({ value, label }) => {
                const isSelected = formData.position === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={activeCard !== 1 || exitingCard !== null}
                    onClick={() => {
                      updateField("position", value);
                      setTimeout(() => advanceTo(2), 320);
                    }}
                    className="rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97]"
                    style={{
                      borderColor: isSelected ? "white" : "rgba(255,255,255,0.3)",
                      background: isSelected ? "white" : "rgba(255,255,255,0.12)",
                      color: isSelected ? "var(--brand-blue-hex)" : "white",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Card 2: Employment Duration ── */}
        <div
          ref={(el) => { cardRefs.current[2] = el; }}
          className="absolute inset-x-0 top-0 rounded-[var(--radius-lg)] border px-5 py-5"
          style={{ ...cardStyle(2), ...cardBg(2) }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className={`truncate min-w-0 text-base font-bold ${showContent(2) ? "text-white" : "text-[var(--text-primary)]"}`}>{cardTitles[2]}</span>
            {showContent(2) && <span className="whitespace-nowrap shrink-0 text-xs text-white/60">Select one</span>}
          </div>
          {showContent(2) && (
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_DURATION_OPTIONS.map(({ value, label }) => {
                const isSelected = formData.employmentDuration === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={activeCard !== 2 || exitingCard !== null}
                    onClick={() => {
                      updateField("employmentDuration", value);
                      setTimeout(() => advanceTo(3), 320);
                    }}
                    className="rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97]"
                    style={{
                      borderColor: isSelected ? "white" : "rgba(255,255,255,0.3)",
                      background: isSelected ? "white" : "rgba(255,255,255,0.12)",
                      color: isSelected ? "var(--brand-blue-hex)" : "white",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Card 3: Bankruptcy & DRS ── */}
        <div
          ref={(el) => { cardRefs.current[3] = el; }}
          className="absolute inset-x-0 top-0 rounded-[var(--radius-lg)] border px-5 py-5"
          style={{ ...cardStyle(3), ...cardBg(3) }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className={`truncate min-w-0 text-base font-bold ${showContent(3) ? "text-white" : "text-[var(--text-primary)]"}`}>{cardTitles[3]}</span>
            {showContent(3) && <span className="whitespace-nowrap shrink-0 text-xs text-white/60">Select one</span>}
          </div>
          {showContent(3) && (
            <>
              <p className="mb-3 text-sm text-white/70">
                Select the option that applies to you as of today.
              </p>
              <div className="flex flex-col gap-2">
                {/* Primary confirm option */}
                <button
                  type="button"
                  disabled={activeCard !== 3}
                  onClick={() => {
                    updateField("bankruptcyDeclaration", "clear");
                    // Defer scroll until after React re-renders the taller card
                    // (confirmation box) and the CSS height transition has started,
                    // so scrollHeight is based on the updated layout.
                    setTimeout(() => onBankruptcyClear?.(), 50);
                  }}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]"
                  style={{
                    borderColor: isBankruptcyClearSelected ? "oklch(0.75 0.17 145)" : "rgba(255,255,255,0.25)",
                    background: isBankruptcyClearSelected ? "oklch(0.50 0.15 145 / 0.30)" : "rgba(255,255,255,0.1)",
                  }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                    style={{
                      borderColor: isBankruptcyClearSelected ? "oklch(0.75 0.17 145)" : "rgba(255,255,255,0.5)",
                      background: isBankruptcyClearSelected ? "oklch(0.55 0.18 145)" : "transparent",
                    }}
                  >
                    {isBankruptcyClearSelected && <CheckCircle size={14} weight="fill" color="white" />}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: isBankruptcyClearSelected ? "oklch(0.95 0.06 145)" : "white" }}>
                    Yes, I confirm — I am not bankrupt, under DRS, or self-excluded as of this application.
                  </span>
                </button>

                {/* Discharged bankrupt — green */}
                <button
                  type="button"
                  disabled={activeCard !== 3}
                  onClick={() => updateField("bankruptcyDeclaration", "discharged_lt5")}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all duration-200 active:scale-[0.99]"
                  style={{
                    borderColor: isBankruptcyDischargedSelected ? "oklch(0.75 0.17 145)" : "rgba(255,255,255,0.25)",
                    background: isBankruptcyDischargedSelected ? "oklch(0.50 0.15 145 / 0.30)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                    style={{
                      borderColor: isBankruptcyDischargedSelected ? "oklch(0.75 0.17 145)" : "rgba(255,255,255,0.5)",
                      background: isBankruptcyDischargedSelected ? "oklch(0.55 0.18 145)" : "transparent",
                    }}
                  >
                    {isBankruptcyDischargedSelected && <CheckCircle size={14} weight="fill" color="white" />}
                  </span>
                  <span className="text-sm" style={{ color: isBankruptcyDischargedSelected ? "oklch(0.95 0.06 145)" : "rgba(255,255,255,0.85)" }}>
                    I am a discharged bankrupt (less than 5 years ago)
                  </span>
                </button>

                {/* Active bankruptcy / DRS — red */}
                <button
                  type="button"
                  disabled={activeCard !== 3}
                  onClick={() => updateField("bankruptcyDeclaration", "active")}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all duration-200 active:scale-[0.99]"
                  style={{
                    borderColor: isBankruptcyActiveSelected ? "oklch(0.85 0.15 25)" : "rgba(255,255,255,0.25)",
                    background: isBankruptcyActiveSelected ? "oklch(0.55 0.20 25 / 0.25)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                    style={{
                      borderColor: isBankruptcyActiveSelected ? "oklch(0.85 0.15 25)" : "rgba(255,255,255,0.5)",
                      background: isBankruptcyActiveSelected ? "oklch(0.55 0.20 25)" : "transparent",
                    }}
                  >
                    {isBankruptcyActiveSelected && <CheckCircle size={14} weight="fill" color="white" />}
                  </span>
                  <span className="text-sm" style={{ color: isBankruptcyActiveSelected ? "oklch(0.95 0.10 25)" : "rgba(255,255,255,0.85)" }}>
                    I am currently under bankruptcy / DRS status
                  </span>
                </button>
              </div>

              {isBankruptcyDischargedSelected && (
                <div className="mt-3 rounded-[var(--radius-md)] border border-[oklch(0.75_0.17_145_/_0.4)] bg-[oklch(0.50_0.15_145_/_0.2)] px-4 py-3">
                  <p className="text-xs leading-relaxed text-[oklch(0.95_0.06_145)]">
                    Please bring along your bankruptcy/DRS discharge letter to the appointment.
                  </p>
                </div>
              )}

              {isBankruptcyActiveSelected && (
                <div className="mt-3 rounded-[var(--radius-md)] border border-[oklch(0.85_0.15_25_/_0.4)] bg-[oklch(0.55_0.20_25_/_0.2)] px-4 py-3">
                  <p className="text-xs leading-relaxed text-[oklch(0.95_0.10_25)]">
                    We are currently not able to issue loans if you are not discharged from bankruptcy or DRS status.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 9: Moneylender Loans ────────────────────────────────────────────────

export function Step9_MoneylenderLoans({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  const rawAmount = formData.moneylenderLoanAmount ?? "";
  const hasAmount =
    rawAmount.trim() !== "" &&
    !Number.isNaN(parseInt(rawAmount, 10));

  return (
    <div>
      <StepHeader
        icon={ChartLineUp}
        title="Any moneylender loans?"
        subtitle="Include any outstanding licensed moneylender balances."
      />

      <div className="flex flex-col gap-4">
        {/* Amount input — always visible */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-[var(--text-primary)]">
            Total outstanding amount
          </label>
          <div
            className="flex min-h-[40px] sm:min-h-[46px] items-center rounded-[var(--radius-md)] border bg-[var(--surface-elevated)] gap-2 pl-4 pr-4 transition-all duration-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10"
            style={{
              borderColor: formData.moneylenderNoLoans
                ? "var(--border-subtle)"
                : "var(--border-subtle)",
              opacity: formData.moneylenderNoLoans ? 0.45 : 1,
            }}
          >
            <span className="shrink-0 select-none text-sm text-[var(--text-tertiary)]">$</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 5,000"
              value={formData.moneylenderLoanAmount}
              onFocus={() => {
                if (formData.moneylenderNoLoans) {
                  updateField("moneylenderNoLoans", false);
                }
              }}
              onChange={(e) => {
                updateField("moneylenderLoanAmount", e.target.value);
                if (e.target.value.trim() !== "") {
                  updateField("moneylenderNoLoans", false);
                }
              }}
              className="min-w-0 flex-1 border-0 bg-transparent py-2 sm:py-3 pl-0 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>

        {/* Payment history — revealed directly below the amount input */}
        {hasAmount && !formData.moneylenderNoLoans && (
          <div className="animate-slide-in" key="payment-history">
            <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
              How is your payment history?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_HISTORY_OPTIONS.map(({ value, label, emoji }) => {
                const isSelected = formData.moneylenderPaymentHistory === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      updateField("moneylenderPaymentHistory", value)
                    }
                    className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border py-3 transition-all duration-200 active:scale-[0.96]"
                    style={{
                      borderColor: isSelected
                        ? "var(--brand-blue-hex)"
                        : "var(--border-subtle)",
                      background: isSelected
                        ? "var(--brand-blue-hex)"
                        : "transparent",
                    }}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span
                      className="text-[11px] font-medium text-center leading-tight"
                      style={{
                        color: isSelected
                          ? "var(--text-on-brand)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* "No loans to declare" — prominent, easy-to-tap */}
        <button
          type="button"
          onClick={() => {
            const next = !formData.moneylenderNoLoans;
            updateField("moneylenderNoLoans", next);
            if (next) {
              updateField("moneylenderLoanAmount", "");
              updateField("moneylenderPaymentHistory", "");
            }
          }}
          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]"
          style={{
            borderColor: formData.moneylenderNoLoans
              ? "var(--brand-blue-hex)"
              : "var(--border-subtle)",
            background: formData.moneylenderNoLoans
              ? "oklch(0.32 0.14 260 / 0.06)"
              : "var(--surface-elevated)",
          }}
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150"
            style={{
              borderColor: formData.moneylenderNoLoans
                ? "var(--brand-blue-hex)"
                : "var(--border-medium)",
              background: formData.moneylenderNoLoans
                ? "var(--brand-blue-hex)"
                : "transparent",
            }}
          >
            {formData.moneylenderNoLoans && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </span>
          <span
            className="text-sm font-medium"
            style={{
              color: formData.moneylenderNoLoans
                ? "var(--brand-blue-hex)"
                : "var(--text-secondary)",
            }}
          >
            No moneylender loans to declare
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Legal modal ─────────────────────────────────────────────────────────────

const TERMS_CONTENT = `
**Effective as of 1 January 2019**

### 1. Introduction

Please peruse these Agreements carefully as they encompass important information about Crawfort Service provided to you, the Terms, future changes to these Agreements, Privacy Information, waiver, limitation of liability, Governing Law etc.

In order to use Crawfort Service, you need to be (1) 18 or older, (2) have the power and capability to enter into a legally binding contract with us and not barred from doing so under any applicable laws and (3) be a resident or legally employed in Singapore.

By clicking "Apply Now" or otherwise applying/engaging Crawfort Pte. Ltd. ("Crawfort", the "Company", "we", "us", "our") financial service ("Crawfort Service" or "Service" or "Loan"), including via software application or website, you are entering into a binding contract with Crawfort Pte Ltd (UEN No. 201406595W).

Your agreement with us includes these Terms and Conditions ("Terms") and our Personal Data Protection Policy (the "Privacy Policy"). If you don't agree with (or cannot comply with) the agreements, then you are not eligible to use Crawfort service.

### 2. Changes to the Agreements

We reserve the right to modify or amend these Agreements at any time. When material changes are made to the Agreements, we will provide you with a notice by notifying you via our software application, sending you an email, or sending you a text message. We endeavour to notify you at least 14 days in advance.

### 3. Intellectual Property and Copyright

All Crawfort trademarks, services marks, trade names, logos, domain names, and any other features of Crawfort ("Crawfort Brand Features") may not be used in connection with any product or service without the prior written consent of Crawfort.

### 4. Third Party Applications

Crawfort Service is integrated with third party application, websites and services ("Third Party Application") to enable us to provide you with our Service. The Third Party Application has their own terms and conditions of use and privacy policy.

### 5. Our Rights

Crawfort reserves the right to remove or disable access to any user/applicant for any or no reason, including but not limited to any violation, in Crawfort's sole discretion, of these Agreements or any applicable law.

### 6. User Guidelines

To ensure compliance with the applicable laws of Singapore, you must strictly observe the following:

- You MUST NOT provide or share your Crawfort login and account details with a third party.
- You shall not use any automated means to collect information from or to gain unauthorised access to Crawfort systems.
- You shall not impersonate another user, person, or entity.
- You shall be solely responsible to ensure your account login details are kept confidential and secure.
- You shall not interfere with or disrupt the Crawfort Service.

### 7. Service Limitations and Modifications

Crawfort will make reasonable efforts to keep Crawfort Service operational. However, certain technical difficulties or maintenance may, from time to time, result in temporary interruptions.

### 8. Customer Support

For customer support or any queries related to our Crawfort Service, kindly contact us via our Contact Us section of our website or call us at +65 6777 8080. We will attempt to respond to all customer support queries within 5 working days.

### 9. Term and Termination

This Agreement will continue to apply until it has been terminated by you or Crawfort. Clauses 3, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16 and 17 shall survive the termination.

### 10. Warranty and Disclaimer

Crawfort Service is provided "as available", without express or implied warranty or condition of any kind. You use our service at your own risk.

### 11. Limitation

To the fullest extent permitted by law, in no event will Crawfort, its officers, shareholders, employees, agents or directors be liable for any indirect, special, incidental, punitive, exemplary, or consequential damages.

### 12. Entire Agreement

These Agreements constitute all the terms and conditions agreed upon between you and Crawfort and supersede any prior agreements in relation to the subject matter of these Agreements.

### 13. Governing Law and Jurisdiction

These Agreements shall be governed by and construed in accordance with the law of the Republic of Singapore and the Parties agree to submit to the exclusive jurisdiction of the Singapore Courts.

### 14. Contact Us

If you have any questions, please contact us at dposg@crawfort.com.
`;

const PRIVACY_CONTENT = `
### 1. Introduction

Crawfort Pte Ltd (the "Company") takes our responsibilities under Singapore's Personal Data Protection Act 2012 (the "PDPA") seriously. We recognise the importance of the personal data our customers, employees and third parties have personally entrusted to us.

### 2. Purpose

This policy governs the collection, use and disclosure of personal data from employees, customers and third parties and explains how we collect and handle personal data of individuals in compliance with the PDPA.

### 3. Responsible

The Company's appointed Data Protection Officer (DPO) will update this Data Protection Policy from time to time to ensure consistency with future developments, market trends and/or any changes in technology, legal or regulatory requirements.

### 4. Scope

This policy covers all the activities of Crawfort Pte Ltd related to Personal Data received from employees, customers and third parties.

### 5. Consent

We will collect, use or disclose personal data for employment and reasonable business purposes only if there is consent or deemed consent from the individual. We may also collect, use or disclose personal data if it is required or authorised under applicable laws.

### 6. Collection of Personal Data

**6.1 Personal Data Collected from Customers**

We only collect personal data from our customers to enable us to understand their financial needs and assess their loan application as required by law. We use personal data of customers for the following purposes:

1. For submission to Moneylenders Credit Bureau (MLCB) for the purpose of producing a credit report.
2. For submission to the Registry of Moneylenders.
3. To conduct online searches via web portals such as DP Information Network Pte Ltd, Credit Bureau (Singapore) Pte Ltd.
4. Understanding our customer's financial needs and to assist in customising loan packages.
5. Assessing our customer's loan application and to comply with the laws of Singapore.
6. For debt recovery purposes — to engage law firms, third-party debt collection agencies or approved debt collectors.

**6.1.2 Type of Personal Data Collected**

Full Name, Personal Identification Number (IC No., FIN No., or Passport No.), Nationality, Date of Birth, Sex, Ethnicity, Address, Contact No., Marriage Status, Email Address, Income, Employment information, Photograph, Next-of-Kin contact details.

### 7. Disclosure of Personal Data

We do not disclose personal data to third parties except when required by law, when we have the individual's consent, or when we have engaged third parties to assist with debt recovery or certain company activities such as accounting and auditing. Any such third parties are bound contractually to keep all information confidential.

### 8. Access to and Correction of Personal Data

Upon request, we will provide customers access to their personal data in accordance with the requirements of the PDPA. Customers may contact us via email at dposg@crawfort.com.

### 9. Withdrawal of Consent

Requests for withdrawal of consent will be processed within 5 working days. We will inform the individual of the likely consequences of withdrawing their consent.

### 10. Accuracy of Personal Data

We ensure that personal data collected is accurate, genuine and up-to-date by verifying the data against the original relevant document or via verified sources such as Singpass or Myinfo.

### 11. Security and Protection of Personal Data

We have implemented generally accepted standards of technology and operational security to protect the personal data in our possession and to prevent unauthorised access, collection, use, disclosure, copying, modification, or disposal.

### 12. Retention of Personal Data

The minimum retention period of information relating to the loan is 5 years after the termination of the loan. Thereafter, we will cease to retain personal data as soon as it is reasonable to assume the purpose for collection is no longer being served.

### 13. Transfer of Personal Data outside of Singapore

We do not transfer data overseas. Should there be any transfers, we will ensure compliance with the PDPA to maintain a comparable standard of protection.

### 14. Privacy on Our Websites

This Policy also applies to any personal data we collect via our websites. Cookies may be used on some pages of our websites to improve users' navigational experience.

### 15. Notification

We endeavour to notify our customers of any changes to this policy 14 days in advance. Communication will be made via our software application, email, or text message.

### 16. Data Protection Officer

If you believe that information we hold about you is incorrect, or have concerns about how we handle your personal data, you may contact our Data Protection Officer at dposg@crawfort.com.
`;

function parseLegalContent(content: string): React.ReactNode[] {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="mt-5 mb-2 font-display text-sm font-bold text-[var(--text-primary)] first:mt-0">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      elements.push(
        <p key={key++} className="mb-1 text-xs font-semibold text-[var(--text-primary)]">
          {trimmed.slice(2, -2)}
        </p>
      );
    } else if (/^\d+\./.test(trimmed)) {
      elements.push(
        <p key={key++} className="text-xs leading-relaxed text-[var(--text-secondary)] pl-3">
          {trimmed}
        </p>
      );
    } else if (trimmed.startsWith("- ")) {
      elements.push(
        <p key={key++} className="text-xs leading-relaxed text-[var(--text-secondary)] pl-3">
          • {trimmed.slice(2)}
        </p>
      );
    } else {
      elements.push(
        <p key={key++} className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {trimmed}
        </p>
      );
    }
  }
  return elements;
}

function LegalModal({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "oklch(0.06 0.02 260 / 0.85)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-2xl"
        style={{ maxHeight: "80dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ background: "linear-gradient(135deg, #0033AA 0%, #0055CC 100%)" }}
        >
          <h2 className="font-display text-base font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:brightness-125 active:scale-[0.95]"
            style={{ background: "oklch(1 0 0 / 0.25)", border: "1.5px solid oklch(1 0 0 / 0.4)" }}
          >
            <X size={14} weight="bold" className="text-white" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-1.5">
            {parseLegalContent(content)}
          </div>
          <p className="mt-6 text-[10px] text-[var(--text-tertiary)]">
            CF Money Pte. Ltd. (UEN No. 201406595W) · dposg@crawfort.com
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ─── Step 8 ───────────────────────────────────────────────────────────────────

export function Step7_BankruptcyDeclaration({
  formData,
  updateField,
  onClear,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  onClear?: () => void;
}) {
  const isClear      = formData.bankruptcyDeclaration === "clear";
  const isDischarged = formData.bankruptcyDeclaration === "discharged_lt5";
  const isActive     = formData.bankruptcyDeclaration === "active";

  return (
    <div>
      <StepHeader
        icon={ShieldCheck}
        title="A Quick Check"
        subtitle="Help us confirm your financial standing to move forward."
      />

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-3">
            <label className="block w-full text-base font-medium text-[var(--text-primary)]">
              Which of the following applies to you at this time?
            </label>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Not bankrupt option — green when selected */}
            <button
              type="button"
              onClick={() => {
                updateField("bankruptcyDeclaration", "clear");
                setTimeout(() => onClear?.(), 50);
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]"
              style={{
                borderColor: isClear ? "oklch(0.55 0.15 145)" : "var(--border-subtle)",
                background:  isClear ? "oklch(0.55 0.15 145 / 0.06)" : "var(--surface-elevated)",
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                style={{
                  borderColor: isClear ? "oklch(0.55 0.15 145)" : "var(--border-medium)",
                  background:  isClear ? "oklch(0.55 0.15 145)" : "transparent",
                }}
              >
                {isClear && <CheckCircle size={14} weight="fill" color="white" />}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: isClear ? "oklch(0.40 0.12 145)" : "var(--text-primary)" }}
              >
                I do not have any active bankruptcy, DRS, or self-exclusion records.
              </span>
            </button>

            {/* Discharged bankrupt option — blue when selected */}
            <button
              type="button"
              onClick={() => updateField("bankruptcyDeclaration", "discharged_lt5")}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all duration-200 active:scale-[0.99]"
              style={{
                borderColor: isDischarged ? "var(--brand-blue-hex)" : "var(--border-subtle)",
                background:  isDischarged ? "oklch(0.32 0.14 260 / 0.06)" : "var(--surface-elevated)",
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                style={{
                  borderColor: isDischarged ? "var(--brand-blue-hex)" : "var(--border-medium)",
                  background:  isDischarged ? "var(--brand-blue-hex)" : "transparent",
                }}
              >
                {isDischarged && <CheckCircle size={14} weight="fill" color="white" />}
              </span>
              <span
                className="text-sm"
                style={{ color: isDischarged ? "var(--brand-blue-hex)" : "var(--text-secondary)" }}
              >
                I have previously been discharged from bankruptcy (within the last 5 years).
              </span>
            </button>

            {/* Active bankruptcy / DRS option */}
            <button
              type="button"
              onClick={() => updateField("bankruptcyDeclaration", "active")}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all duration-200 active:scale-[0.99]"
              style={{
                borderColor: isActive ? "oklch(0.65 0.18 25)" : "var(--border-subtle)",
                background:  isActive ? "oklch(0.65 0.18 25 / 0.06)" : "var(--surface-elevated)",
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-150"
                style={{
                  borderColor: isActive ? "oklch(0.65 0.18 25)" : "var(--border-medium)",
                  background:  isActive ? "oklch(0.65 0.18 25)" : "transparent",
                }}
              >
                {isActive && <CheckCircle size={14} weight="fill" color="white" />}
              </span>
              <span
                className="text-sm"
                style={{ color: isActive ? "oklch(0.40 0.15 25)" : "var(--text-secondary)" }}
              >
                I have an ongoing bankruptcy or Debt Repayment Scheme (DRS).
              </span>
            </button>
          </div>
        </div>

        {isDischarged && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50 px-4 py-3">
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-brand-blue" />
            <p className="text-sm text-brand-blue leading-snug">
              Please bring along your bankruptcy/DRS discharge letter to the appointment.
            </p>
          </div>
        )}

        {isActive && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 leading-snug">
              We are currently not able to issue loans if you are not discharged from bankruptcy or DRS status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableReviewRow({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  }, [draft, onSave, value]);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
              className="w-36 sm:w-44 rounded-[var(--radius-sm)] border border-brand-blue bg-[var(--surface-elevated)] px-2 py-1 text-right text-sm font-medium text-[var(--text-primary)] outline-none ring-2 ring-brand-blue/10"
            />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(); }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue transition-all hover:brightness-110"
              aria-label="Save"
            >
              <Check size={12} weight="bold" className="text-white" />
            </button>
          </>
        ) : (
          <>
            <span className="font-medium text-[var(--text-primary)] text-right max-w-[180px] truncate">
              {value || "—"}
            </span>
            <button
              type="button"
              onClick={() => { setDraft(value); setEditing(true); }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] transition-all duration-150 hover:border-[var(--border-medium)] hover:text-brand-blue active:scale-95"
              aria-label={`Edit ${label}`}
            >
              <PencilSimple size={12} weight="bold" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Step8_Review({
  formData,
  updateField,
  monthlyRepayment,
  onModalOpenChange,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  monthlyRepayment: number;
  onModalOpenChange?: (open: boolean) => void;
}) {
  const [openModal, setOpenModal] = useState<"terms" | "privacy" | null>(null);

  const handleOpenModal = useCallback((modal: "terms" | "privacy") => {
    setOpenModal(modal);
    onModalOpenChange?.(true);
  }, [onModalOpenChange]);

  const handleCloseModal = useCallback(() => {
    setOpenModal(null);
    onModalOpenChange?.(false);
  }, [onModalOpenChange]);

  const authLabel =
    formData.authMethod === "singpass"
      ? "Singpass (Myinfo)"
      : formData.authMethod === "manual"
        ? "Manual form"
        : "—";

  const loanRows = [
    { label: "Amount", value: formatCurrency(formData.amount) },
    { label: "Tenure", value: `${formData.tenure} months` },
    { label: "Monthly instalment", value: formatCurrency(monthlyRepayment) },
    { label: "Urgency", value: URGENCY_OPTIONS.find((o) => o.value === formData.urgency)?.label ?? "—" },
    { label: "Monthly income", value: formData.monthlyIncome ? formatCurrency(parseInt(formData.monthlyIncome, 10) || 0) : "—" },
    { label: "Verification", value: authLabel },
  ];

  const personalStaticRows = [
    { label: "ID Type", value: ID_TYPE_OPTIONS.find((o) => o.value === formData.idType)?.label ?? "—" },
    { label: "Name", value: formData.fullName || "—" },
    { label: "NRIC / FIN", value: formData.nric ? `${formData.nric.slice(0, 1)}****${formData.nric.slice(-1)}` : "—" },
    { label: "Mobile", value: formData.mobile ? `+65 ${formData.mobile}` : "—" },
    ...(formData.address ? [{ label: "Address", value: formData.address }] : []),
    ...(formData.postalCode ? [{ label: "Postal Code", value: formData.postalCode }] : []),
  ];


  return (
    <div>
      <StepHeader
        icon={ShieldCheck}
        title="Review your application"
        subtitle="Please confirm everything is correct before submitting."
      />

      <div className="flex flex-col gap-5">
        {/* Loan & income */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <CurrencyDollar size={16} weight="duotone" className="text-brand-blue" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Loan &amp; income</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            {loanRows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-tertiary)]">{label}</span>
                <span className="font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Info — with editable Marital Status + Email */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <User size={16} weight="duotone" className="text-brand-blue" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Personal Info</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            {personalStaticRows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-tertiary)]">{label}</span>
                <span className="font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}
            <EditableReviewRow
              label="Marital Status"
              value={formData.maritalStatus}
              onSave={(v) => updateField("maritalStatus", v)}
            />
            <EditableReviewRow
              label="Email"
              value={formData.email}
              onSave={(v) => updateField("email", v)}
            />
          </div>
        </div>

      </div>

      <div className="mt-6 rounded-[var(--radius-md)] bg-brand-teal/[0.06] px-4 py-3">
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          By submitting, you agree to Crawfort&apos;s{" "}
          <button
            type="button"
            onClick={() => handleOpenModal("terms")}
            className="font-medium text-brand-blue underline-offset-2 hover:underline"
          >
            Terms &amp; Conditions
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => handleOpenModal("privacy")}
            className="font-medium text-brand-blue underline-offset-2 hover:underline"
          >
            Privacy Policy
          </button>
          . Your data is encrypted and protected under Singapore&apos;s PDPA.
        </p>
      </div>

      {openModal === "terms" && (
        <LegalModal
          title="Terms & Conditions"
          content={TERMS_CONTENT}
          onClose={handleCloseModal}
        />
      )}
      {openModal === "privacy" && (
        <LegalModal
          title="Privacy Policy"
          content={PRIVACY_CONTENT}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export function MobileHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-30 flex items-center px-6 lg:hidden transition-all duration-300 ${
        scrolled
          ? "bg-brand-blue shadow-sm py-3"
          : "bg-transparent pb-4 pt-8"
      }`}
    >
      <a href="/" className="relative block h-4">
        <Image
          src="/images/cf-money-full-color.png"
          alt="CF Money"
          width={120}
          height={36}
          className={`absolute inset-0 h-4 w-auto transition-opacity duration-300 ${scrolled ? "opacity-0" : "opacity-100"}`}
          priority
        />
        <Image
          src="/images/cf-money-white.png"
          alt="CF Money"
          width={120}
          height={36}
          className={`h-4 w-auto transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}
          priority
          aria-hidden={!scrolled}
        />
      </a>
    </div>
  );
}
