"use client";

import Image from "next/image";
import React, { useState, useCallback, useMemo } from "react";
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
} from "@phosphor-icons/react";

/** 1–2: loan + income only · 3: Singpass vs manual · 4–8: personal details */
const TOTAL_STEPS = 8;

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
    <div className="mb-6 sm:mb-6">
      {/* Mobile: icon inline with heading */}
      <div className="flex items-center gap-3 sm:block">
        <div className="shrink-0 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-blue/[0.06] sm:mb-3">
          <Icon size={18} weight="duotone" className="text-brand-blue sm:hidden" />
          <Icon size={22} weight="duotone" className="text-brand-blue hidden sm:block" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] max-w-[45ch]">
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
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--text-primary)]">
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
          className={`min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-tertiary)] ${
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

export function LoanApplicationForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);


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
      default:
        return false;
    }
  }, [step, formData]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS) { setStep((s) => s + 1); scrollToTop(); }
  }, [step, scrollToTop]);

  const handleBack = useCallback(() => {
    if (step > 1) { setStep((s) => s - 1); scrollToTop(); }
  }, [step, scrollToTop]);

  const handleSubmit = useCallback(() => {
    setIsSubmitted(true);
    scrollToTop();
  }, [scrollToTop]);

  const sliderPercentage = useMemo(() => {
    return ((formData.amount - 500) / (100000 - 500)) * 100;
  }, [formData.amount]);

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-up">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/10">
          <CheckCircle size={36} weight="duotone" className="text-brand-teal" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Application Submitted
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] max-w-[38ch]">
          We&apos;re reviewing your application now. Expect a response via SMS
          within 8 minutes.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-5">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Loan Amount</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(formData.amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Tenure</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formData.tenure} months
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Est. Monthly</span>
            <span className="font-semibold text-brand-blue">
              {formatCurrency(monthlyRepayment)}
            </span>
          </div>
          {formData.monthlyIncome && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-tertiary)]">
                Declared monthly income
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(parseInt(formData.monthlyIncome, 10) || 0)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
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
            onBack={() => { setStep(2); scrollToTop(); }}
            onSingpass={() => {
              updateField("authMethod", "singpass");
              setStep(4);
              scrollToTop();
            }}
            onManual={() => {
              updateField("authMethod", "manual");
              setStep(4);
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
              Continue
              <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
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
            <span>1</span>
            <span>24 months</span>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] p-3 sm:p-5" style={{ background: "var(--brand-teal-hex)" }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.25 0.08 178)" }}>
            Est. monthly repayment
          </span>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums" style={{ color: "oklch(0.18 0.06 178)" }}>
              {formatCurrency(monthlyRepayment)}
            </span>
            <span className="text-xs font-medium" style={{ color: "oklch(0.28 0.07 178)" }}>/mo</span>
          </div>
          <span className="mt-0.5 block text-xs" style={{ color: "oklch(0.30 0.07 178)" }}>
            Estimate only. Your actual rates may be lower.
          </span>
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
          label="Monthly income (self-declared)"
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
        Auto-fill your details via Myinfo to speed things up.
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
          className="h-5 w-auto"
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
        subtitle="Tell us how you earn a living. Your declared income was captured earlier."
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
