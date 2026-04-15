"use client";

import Image from "next/image";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { LoanLoadingScreen } from "./loan-loading-screen";
import { LoanResults } from "./loan-results";
import { AppointmentBooking } from "./appointment-booking";
import {
  Lightning,
  CalendarBlank,
  Question,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  CurrencyDollar,
  User,
  Briefcase,
  Phone,
  IdentificationCard,
  Buildings,
  MapPin,
  ChartLineUp,
  Lock,
  Fingerprint,
  Coins,
  MagnifyingGlass,
  Plus,
  Minus,
  CaretDown,
  Warning,
} from "@phosphor-icons/react";

/** 1–2: loan + income only · 3: Singpass vs manual · 4–8: personal details · 9: employment & declaration */
const TOTAL_STEPS = 9;

const TENURE_OPTIONS = [1, 3, 6, 9, 12, 18, 24];

const URGENCY_OPTIONS = [
  { value: "today", label: "Today", icon: Lightning },
  { value: "this_week", label: "This Week", icon: CalendarBlank },
  { value: "not_sure", label: "Not Sure", icon: Question },
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
  { value: "senior_executive", label: "Senior Executive" },
  { value: "non_executive", label: "Non-Executive" },
  { value: "senior_manager", label: "Senior Manager" },
  { value: "manager", label: "Manager / Assistant Manager" },
  { value: "junior_executive", label: "Junior Executive" },
  { value: "professional", label: "Professional" },
  { value: "supervisor", label: "Supervisor" },
  { value: "director_gm", label: "Director / GM" },
  { value: "others", label: "Others" },
] as const;

const EMPLOYMENT_DURATION_OPTIONS = [
  { value: "less_1m", label: "Less than 1 month" },
  { value: "1m", label: "1 month" },
  { value: "2m", label: "2 months" },
  { value: "3m", label: "3 months" },
  { value: "4m", label: "4 months" },
  { value: "5m", label: "5 months" },
  { value: "6_7m", label: "6–7 months" },
  { value: "8_9m", label: "8–9 months" },
  { value: "10_12m", label: "10–12 months" },
  { value: "1_2y", label: "1–2 years" },
  { value: "3_4y", label: "3–4 years" },
  { value: "5_7y", label: "5–7 years" },
  { value: "8_10y", label: "8–10 years" },
  { value: "10y_plus", label: "10 years and above" },
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateMonthlyRepayment(amount: number, months: number): number {
  const monthlyRate = 0.47 / 12; // 47% p.a. reducing balance
  if (months === 0) return 0;
  return (
    (amount * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

interface FormData {
  amount: number;
  tenure: number;
  urgency: string;
  /** How the user continues after step 3 */
  authMethod: "" | "singpass" | "manual";
  idType: string;
  fullName: string;
  nric: string;
  employmentStatus: string;
  monthlyIncome: string;
  mobile: string;
  loanPurpose: string;
  postalCode: string;
  address: string;
  // Step 9 fields
  workIndustry: string;
  position: string;
  employmentDuration: string;
  officePhone: string;
  mailingAddress: string;
  secondaryMobile: string;
  bankruptcyDeclaration: "" | "yes" | "no";
}

const initialFormData: FormData = {
  amount: 5000,
  tenure: 6,
  urgency: "",
  authMethod: "",
  idType: "",
  fullName: "",
  nric: "",
  employmentStatus: "",
  monthlyIncome: "",
  mobile: "",
  loanPurpose: "",
  postalCode: "",
  address: "",
  workIndustry: "",
  position: "",
  employmentDuration: "",
  officePhone: "",
  mailingAddress: "",
  secondaryMobile: "",
  bankruptcyDeclaration: "",
};

function StepIndicator({
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
  prefix,
  helper,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-medium text-[var(--text-primary)]">
        {label}
      </label>
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

export function LoanApplicationForm() {
  // Navigation history stack — Back always pops, so non-linear jumps (e.g.
  // Singpass skipping steps 4-7) are correctly unwound on Back.
  const [history, setHistory] = useState<number[]>([1]);
  const step = history[history.length - 1];

  const navigateTo = useCallback((next: number) => {
    setHistory((h) => [...h, next]);
  }, []);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [postSubmitPhase, setPostSubmitPhase] = useState<PostSubmitPhase>("form");

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
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
      incomeNum > 0;

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
        return formData.employmentStatus !== "" && hasDeclaredIncome;
      case 6:
        return formData.mobile.trim().length >= 8;
      case 7:
        return formData.loanPurpose !== "";
      case 8:
        return true;
      case 9:
        return (
          formData.workIndustry !== "" &&
          formData.position !== "" &&
          formData.employmentDuration !== "" &&
          formData.bankruptcyDeclaration !== ""
        );
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

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS) { navigateTo(step + 1); scrollToTop(); }
  }, [step, navigateTo, scrollToTop]);

  const handleBack = useCallback(() => {
    // Pop the history stack so Back always returns to where the user actually
    // came from, including non-linear jumps (e.g. Singpass skipping steps 4-7).
    if (history.length > 1) {
      setHistory((h) => h.slice(0, -1));
      scrollToTop();
    }
  }, [history, scrollToTop]);

  const handleSubmit = useCallback(() => {
    setPostSubmitPhase("loading");
    scrollToTop();
  }, [scrollToTop]);

  const handleLoadingComplete = useCallback(() => {
    setPostSubmitPhase("results");
    scrollToTop();
  }, [scrollToTop]);

  const handleAcceptOffer = useCallback(() => {
    setPostSubmitPhase("booking");
    scrollToTop();
  }, [scrollToTop]);

  const sliderPercentage = useMemo(() => {
    return ((formData.amount - 500) / (100000 - 500)) * 100;
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
      />
    );
  }

  if (postSubmitPhase === "booking") {
    return <AppointmentBooking formData={formData} onBack={() => { setPostSubmitPhase("results"); scrollToTop(); }} />;
  }

  return (
    <div>
      <StepIndicator current={step} total={TOTAL_STEPS} />

      <div key={step} className="animate-slide-in">
        {step === 1 && (
          <Step1_LoanDetails
            formData={formData}
            updateField={updateField}
            monthlyRepayment={monthlyRepayment}
            sliderPercentage={sliderPercentage}
          />
        )}
        {step === 2 && (
          <Step2_SelfDeclaredIncome
            formData={formData}
            updateField={updateField}
          />
        )}
        {step === 3 && (
          <Step3_SingpassGate
            onBack={() => { setHistory((h) => h.slice(0, -1)); scrollToTop(); }}
            onSingpass={() => {
              // Simulate Singpass Myinfo prefill — jump straight to review
              setFormData((prev) => ({
                ...prev,
                authMethod: "singpass",
                idType: "singaporean",
                fullName: "Tan Wei Liang",
                nric: "S8912345D",
                employmentStatus: "full_time",
                monthlyIncome: prev.monthlyIncome || "5500",
                mobile: "91234567",
                loanPurpose: "personal",
                postalCode: "179094",
                address: "1 North Bridge Road #08-01",
              }));
              navigateTo(8);
              scrollToTop();
            }}
            onManual={() => {
              updateField("authMethod", "manual");
              navigateTo(4);
              scrollToTop();
            }}
          />
        )}
        {step === 4 && (
          <Step4_Identity formData={formData} updateField={updateField} />
        )}
        {step === 5 && (
          <Step5_Employment formData={formData} updateField={updateField} />
        )}
        {step === 6 && (
          <Step6_Contact formData={formData} updateField={updateField} />
        )}
        {step === 7 && (
          <Step7_Additional formData={formData} updateField={updateField} />
        )}
        {step === 8 && (
          <Step8_Review
            formData={formData}
            monthlyRepayment={monthlyRepayment}
          />
        )}
        {step === 9 && (
          <Step9_EmploymentDeclaration
            formData={formData}
            updateField={updateField}
          />
        )}
      </div>

      {step !== 3 && (
        <div className="mt-4 sm:mt-8 flex items-center gap-3">
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

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              {step === 8 ? "Confirm" : "Continue"}
              <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              <ShieldCheck size={18} weight="bold" />
              Submit Application
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <p className="mt-5 text-center text-xs text-[var(--text-tertiary)] leading-relaxed">
          Checking rates won&apos;t affect your credit score. We only perform
          soft checks.
        </p>
      )}
    </div>
  );
}

function Step1_LoanDetails({
  formData,
  updateField,
  monthlyRepayment,
  sliderPercentage,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  monthlyRepayment: number;
  sliderPercentage: number;
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
      if (!Number.isNaN(num) && num >= 500 && num <= 100000) {
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
      : Math.round(Math.min(Math.max(num, 500), 100000) / 500) * 500;
    updateField("amount", clamped);
    setAmountRaw(String(clamped));
  }, [amountRaw, updateField]);

  const handleTenureBlur = useCallback(() => {
    setTenureFocused(false);
    const num = parseInt(tenureRaw, 10);
    if (Number.isNaN(num) || num <= 0) { setTenureRaw(String(formData.tenure)); return; }
    const clamped = Math.min(Math.max(num, 1), 12);
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
          <div className="mb-1 flex justify-end">
            <div
              className="flex items-baseline gap-0.5 border-b-2 pb-0.5 transition-colors duration-150"
              style={{ borderColor: amountFocused ? "var(--brand-blue-hex)" : "var(--border-medium)" }}
            >
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-brand-blue">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountFocused ? amountRaw : formData.amount.toLocaleString("en-SG")}
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
              max={100000}
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
            <span>$100,000</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-end justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Pick your tenure
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
                width: `${((formData.tenure - 1) / (12 - 1)) * 100}%`,
                background: "var(--brand-blue-hex)",
              }}
            />
            <input
              type="range"
              min={1}
              max={12}
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
            <span>1</span>
            <span>12 months</span>
          </div>
        </div>

        <div
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3 flex items-center justify-between gap-3"
          style={{ boxShadow: "3px 3px 0px 0px var(--brand-blue-hex)" }}
        >
          <div className="min-w-0">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-primary)]">
              Est. monthly repayment
            </span>
            <span className="mt-0.5 block text-xs text-[var(--text-tertiary)] max-w-[172px]">
              Estimate only. Your actual rates may be lower.
            </span>
          </div>
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="font-display text-xl font-bold tracking-tight text-brand-blue tabular-nums">
              {formatCurrency(monthlyRepayment)}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">/mo</span>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
            When do you need the funds?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_OPTIONS.map(({ value, label, icon: Icon }) => {
              const isSelected = formData.urgency === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField("urgency", value)}
                  className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border py-2.5 sm:py-4 transition-all duration-200 active:scale-[0.96]"
                  style={{
                    borderColor: isSelected
                      ? "var(--brand-blue-hex)"
                      : "var(--border-subtle)",
                    background: isSelected
                      ? "oklch(0.32 0.14 260 / 0.06)"
                      : "transparent",
                  }}
                >
                  <Icon
                    size={22}
                    weight={isSelected ? "duotone" : "regular"}
                    style={{
                      color: isSelected
                        ? "var(--brand-blue-hex)"
                        : "var(--text-tertiary)",
                    }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isSelected
                        ? "var(--brand-blue-hex)"
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

function Step2_SelfDeclaredIncome({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={Coins}
        title="What is your monthly income?"
        subtitle="Helps us confirm the loan fits your budget."
      />
      <div className="flex flex-col gap-5">
        <InputField
          label="Monthly Income (Estimated)"
          type="number"
          placeholder="e.g. 4500"
          value={formData.monthlyIncome}
          onChange={(v) => updateField("monthlyIncome", v)}
          prefix="$"
          helper=""
        />
      </div>
    </div>
  );
}

function Step3_SingpassGate({
  onBack,
  onSingpass,
  onManual,
}: {
  onBack: () => void;
  onSingpass: () => void;
  onManual: () => void;
}) {
  const benefits = [
    "Less paperwork — Myinfo pre-fills your details",
    "Faster decision — CPF data speeds up assessment",
    "Gov-grade security — your session is encrypted end-to-end",
  ];

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
        Continue with Singpass
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] max-w-[42ch]">
        Verify with Singpass for higher approval rates and faster processing.
      </p>

      <ul className="mt-5 flex flex-col gap-2">
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

      <button
        type="button"
        onClick={onSingpass}
        className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 shadow-[0_1px_2px_rgba(0,0,51,0.06)] transition-all duration-200 hover:border-[var(--border-medium)] hover:shadow-[0_2px_6px_rgba(0,0,51,0.1)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        aria-label="Retrieve Myinfo with Singpass"
      >
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Retrieve Myinfo with
        </span>
        <Image
          src="/images/singpass_logo_fullcolours.png"
          alt="Singpass"
          width={88}
          height={28}
          className="h-5 w-auto translate-y-px"
        />
      </button>

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
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>
        <button
          type="button"
          onClick={onManual}
          className="flex items-center gap-2 text-sm font-semibold text-brand-blue transition-colors hover:brightness-110"
        >
          Fill in manually
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}

function Step4_Identity({
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

function Step6_Contact({
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
        subtitle="We'll SMS your approval status and loan details."
      />

      <div className="flex flex-col gap-5">
        <InputField
          label="Mobile Number"
          type="tel"
          placeholder="9123 4567"
          value={formData.mobile}
          onChange={(v) => updateField("mobile", v)}
          prefix="+65"
        />
      </div>
    </div>
  );
}

function Step7_Additional({
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
        <div>
          <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
            Purpose of Loan
          </label>
          <div className="flex flex-wrap gap-2">
            {LOAN_PURPOSE_OPTIONS.map(({ value, label }) => (
              <SelectableChip
                key={value}
                label={label}
                selected={formData.loanPurpose === value}
                onClick={() => updateField("loanPurpose", value)}
              />
            ))}
          </div>
        </div>

        <InputField
          label="Postal Code"
          type="text"
          placeholder="e.g. 520123"
          value={formData.postalCode}
          onChange={(v) => updateField("postalCode", v)}
        />

        <InputField
          label="Residential Address"
          placeholder="Block, Street, Unit"
          value={formData.address}
          onChange={(v) => updateField("address", v)}
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
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  const [optionalOpen, setOptionalOpen] = React.useState(false);

  return (
    <div>
      <StepHeader
        icon={Briefcase}
        title="Employment details"
        subtitle="A few final questions before we process your application."
      />

      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Work industry */}
        <SearchableSelect
          label="Work Industry"
          placeholder="Select your industry"
          options={INDUSTRY_OPTIONS}
          value={formData.workIndustry}
          onChange={(v) => updateField("workIndustry", v)}
        />

        {/* Position */}
        <div>
          <label className="mb-3 block text-base font-medium text-[var(--text-primary)]">
            Position
          </label>
          <div className="flex flex-wrap gap-2">
            {POSITION_OPTIONS.map(({ value, label }) => (
              <SelectableChip
                key={value}
                label={label}
                selected={formData.position === value}
                onClick={() => updateField("position", value)}
              />
            ))}
          </div>
        </div>

        {/* Employment duration */}
        <SearchableSelect
          label="Duration at Current Employer"
          placeholder="How long have you been employed here?"
          options={EMPLOYMENT_DURATION_OPTIONS}
          value={formData.employmentDuration}
          onChange={(v) => updateField("employmentDuration", v)}
        />

        {/* Bankruptcy declaration */}
        <div>
          <label className="mb-1 block text-base font-medium text-[var(--text-primary)]">
            Bankruptcy Declaration
          </label>
          <p className="mb-3 text-sm text-[var(--text-tertiary)]">
            Have you ever been declared bankrupt or are currently an undischarged bankrupt?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["no", "yes"] as const).map((opt) => {
              const isSelected = formData.bankruptcyDeclaration === opt;
              const isYes = opt === "yes";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateField("bankruptcyDeclaration", opt)}
                  className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
                  style={{
                    borderColor: isSelected
                      ? isYes
                        ? "oklch(0.55 0.16 25)"
                        : "var(--brand-teal-hex)"
                      : "var(--border-subtle)",
                    background: isSelected
                      ? isYes
                        ? "oklch(0.55 0.16 25 / 0.07)"
                        : "oklch(0.60 0.13 178 / 0.08)"
                      : "transparent",
                    color: isSelected
                      ? isYes
                        ? "oklch(0.50 0.16 25)"
                        : "var(--brand-teal-hex)"
                      : "var(--text-secondary)",
                  }}
                >
                  {isYes ? (
                    <Warning size={16} weight={isSelected ? "fill" : "regular"} />
                  ) : (
                    <CheckCircle size={16} weight={isSelected ? "fill" : "regular"} />
                  )}
                  {opt === "no" ? "No" : "Yes"}
                </button>
              );
            })}
          </div>
          {formData.bankruptcyDeclaration === "yes" && (
            <div className="mt-3 rounded-[var(--radius-md)] border border-[oklch(0.55_0.16_25_/_0.25)] bg-[oklch(0.55_0.16_25_/_0.05)] px-4 py-3">
              <p className="text-xs leading-relaxed text-[oklch(0.45_0.14_25)]">
                Our team will review your application and contact you directly. Loan approval is subject to our assessment criteria.
              </p>
            </div>
          )}
        </div>

        {/* Optional fields disclosure */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setOptionalOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)]"
          >
            <span className="flex items-center gap-2">
              {optionalOpen ? (
                <Minus size={14} weight="bold" className="text-[var(--text-tertiary)]" />
              ) : (
                <Plus size={14} weight="bold" className="text-brand-blue" />
              )}
              Additional details
              <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-normal text-[var(--text-tertiary)]">
                Optional
              </span>
            </span>
            <CaretDown
              size={13}
              weight="bold"
              className="text-[var(--text-tertiary)] transition-transform duration-200"
              style={{ transform: optionalOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {optionalOpen && (
            <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] px-4 pb-4 pt-4">
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                These fields are not required but may help speed up processing.
              </p>
              <InputField
                label="Office Phone"
                type="tel"
                placeholder="6123 4567"
                value={formData.officePhone}
                onChange={(v) => updateField("officePhone", v)}
                prefix="+65"
                helper="Your office / work direct line"
              />
              <InputField
                label="Mailing Address"
                placeholder="If different from residential address"
                value={formData.mailingAddress}
                onChange={(v) => updateField("mailingAddress", v)}
                helper="Leave blank if same as residential address"
              />
              <InputField
                label="Secondary Mobile Number"
                type="tel"
                placeholder="8123 4567"
                value={formData.secondaryMobile}
                onChange={(v) => updateField("secondaryMobile", v)}
                prefix="+65"
                helper="Alternative contact number"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step8_Review({
  formData,
  monthlyRepayment,
}: {
  formData: FormData;
  monthlyRepayment: number;
}) {
  const authLabel =
    formData.authMethod === "singpass"
      ? "Singpass (Myinfo)"
      : formData.authMethod === "manual"
        ? "Manual form"
        : "—";

  const sections = [
    {
      icon: CurrencyDollar,
      title: "Loan & income",
      rows: [
        { label: "Amount", value: formatCurrency(formData.amount) },
        { label: "Tenure", value: `${formData.tenure} months` },
        { label: "Est. Monthly", value: formatCurrency(monthlyRepayment) },
        {
          label: "Urgency",
          value:
            URGENCY_OPTIONS.find((o) => o.value === formData.urgency)?.label ??
            "—",
        },
        {
          label: "Declared monthly income",
          value: formData.monthlyIncome
            ? formatCurrency(parseInt(formData.monthlyIncome, 10) || 0)
            : "—",
        },
        { label: "Verification", value: authLabel },
      ],
    },
    {
      icon: User,
      title: "Personal Info",
      rows: [
        {
          label: "ID Type",
          value:
            ID_TYPE_OPTIONS.find((o) => o.value === formData.idType)?.label ??
            "—",
        },
        { label: "Name", value: formData.fullName || "—" },
        { label: "NRIC / FIN", value: formData.nric ? `${formData.nric.slice(0, 1)}****${formData.nric.slice(-1)}` : "—" },
      ],
    },
    {
      icon: Briefcase,
      title: "Employment",
      rows: [
        {
          label: "Status",
          value:
            EMPLOYMENT_OPTIONS.find(
              (o) => o.value === formData.employmentStatus,
            )?.label ?? "—",
        },
      ],
    },
    {
      icon: Phone,
      title: "Contact",
      rows: [
        { label: "Mobile", value: formData.mobile ? `+65 ${formData.mobile}` : "—" },
      ],
    },
    {
      icon: MapPin,
      title: "Additional",
      rows: [
        {
          label: "Purpose",
          value:
            LOAN_PURPOSE_OPTIONS.find(
              (o) => o.value === formData.loanPurpose,
            )?.label ?? "—",
        },
        ...(formData.postalCode
          ? [{ label: "Postal Code", value: formData.postalCode }]
          : []),
      ],
    },
  ];

  return (
    <div>
      <StepHeader
        icon={ShieldCheck}
        title="Review your application"
        subtitle="Please make sure everything looks correct before submitting."
      />

      <div className="flex flex-col gap-5">
        {sections.map(({ icon: SectionIcon, title, rows }) => (
          <div key={title}>
            <div className="mb-2 flex items-center gap-2">
              <SectionIcon
                size={16}
                weight="duotone"
                className="text-brand-blue"
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {title}
              </span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              {rows.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="text-[var(--text-tertiary)]">{label}</span>
                  <span className="font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[var(--radius-md)] bg-brand-teal/[0.06] px-4 py-3">
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          By submitting, you agree to Crawfort&apos;s{" "}
          <a href="#" className="font-medium text-brand-blue underline-offset-2 hover:underline">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="#" className="font-medium text-brand-blue underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          . Your data is encrypted and protected under Singapore&apos;s PDPA.
        </p>
      </div>
    </div>
  );
}
