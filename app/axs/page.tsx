"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Warning,
  WarningCircle,
  ShieldCheck,
  ChartLineUp,
} from "@phosphor-icons/react";
import { PaymentHistorySelector } from "@/components/ui/gradient-selector-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type BankruptcyDeclaration = "" | "clear" | "discharged_lt5" | "active";

interface AxsDeclarations {
  moneylenderLoanAmount: string;
  moneylenderNoLoans: boolean;
  moneylenderPaymentHistory: string;
  bankruptcyDeclaration: BankruptcyDeclaration;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        return (
          <div
            key={n}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: n === current ? 24 : 8,
              background: n < current
                ? "var(--brand-teal-hex)"
                : n === current
                  ? "var(--brand-blue-hex)"
                  : "var(--border-subtle)",
            }}
          />
        );
      })}
      <span className="ml-1 text-xs text-[var(--text-tertiary)]">
        {current} of {total}
      </span>
    </div>
  );
}

// ── Step 1: Moneylender loans ──────────────────────────────────────────────────

function MoneylenderStep({
  state,
  onChange,
}: {
  state: AxsDeclarations;
  onChange: <K extends keyof AxsDeclarations>(key: K, value: AxsDeclarations[K]) => void;
}) {
  const rawAmount = state.moneylenderLoanAmount;
  const hasAmount =
    rawAmount.trim() !== "" && !Number.isNaN(parseInt(rawAmount, 10));

  // Delay revealing the payment history section by 1.5 s after a valid amount
  // is entered, so it doesn't pop up abruptly while the user is still typing.
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hasAmount && !state.moneylenderNoLoans) {
      timerRef.current = setTimeout(() => setShowPaymentHistory(true), 1000);
    } else {
      setShowPaymentHistory(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [hasAmount, state.moneylenderNoLoans]);

  return (
    <div className="animate-slide-in">
      {/* Intro context — only on step 1 */}
      <div className="mb-8">
        <h1
          className="text-4xl font-bold text-[var(--text-primary)] leading-tight mb-2"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif", letterSpacing: "-0.04em" }}
        >
          Two quick checks<br />to unlock your offer.
        </h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Helps us calculate the most accurate rates for you.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-1">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{ background: "oklch(0.32 0.14 260 / 0.07)" }}
        >
          <ChartLineUp size={18} weight="duotone" className="text-brand-blue" />
        </div>
        <div>
          <h2
            className="text-lg font-bold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif", letterSpacing: "-0.025em" }}
          >
            Outstanding moneylender loans
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Licensed moneylenders only, no need to declare bank loans.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {/* Amount input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Total outstanding amount
          </label>
          <div
            className="flex min-h-[46px] items-center rounded-[var(--radius-md)] border bg-[var(--surface-elevated)] gap-2 pl-4 pr-4 transition-all duration-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10"
            style={{
              borderColor: "var(--border-subtle)",
              opacity: state.moneylenderNoLoans ? 0.45 : 1,
            }}
          >
            <span className="shrink-0 select-none text-sm text-[var(--text-tertiary)]">$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 5,000"
              value={state.moneylenderLoanAmount}
              onFocus={() => {
                if (state.moneylenderNoLoans) onChange("moneylenderNoLoans", false);
              }}
              onChange={(e) => {
                onChange("moneylenderLoanAmount", e.target.value);
                if (e.target.value.trim() !== "") onChange("moneylenderNoLoans", false);
              }}
              className="min-w-0 flex-1 border-0 bg-transparent py-3 pl-0 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>

        {/* Payment history — revealed 1.5 s after a valid amount is entered */}
        {showPaymentHistory && (
          <div className="animate-slide-in">
            <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
              How is your loan repayment history?
            </label>
            <PaymentHistorySelector
              value={state.moneylenderPaymentHistory}
              onChange={(v) => onChange("moneylenderPaymentHistory", v)}
            />
          </div>
        )}

        {/* No loans toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !state.moneylenderNoLoans;
            onChange("moneylenderNoLoans", next);
            if (next) {
              onChange("moneylenderLoanAmount", "");
              onChange("moneylenderPaymentHistory", "");
            }
          }}
          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]"
          style={{
            borderColor: state.moneylenderNoLoans ? "var(--brand-blue-hex)" : "var(--border-subtle)",
            background: state.moneylenderNoLoans ? "oklch(0.32 0.14 260 / 0.06)" : "var(--surface-elevated)",
          }}
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150"
            style={{
              borderColor: state.moneylenderNoLoans ? "var(--brand-blue-hex)" : "var(--border-medium)",
              background: state.moneylenderNoLoans ? "var(--brand-blue-hex)" : "transparent",
            }}
          >
            {state.moneylenderNoLoans && <div className="h-2 w-2 rounded-full bg-white" />}
          </span>
          <span
            className="text-sm font-medium"
            style={{
              color: state.moneylenderNoLoans ? "var(--brand-blue-hex)" : "var(--text-secondary)",
            }}
          >
            No moneylender loans to declare
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Step 2: DRS / Bankruptcy ───────────────────────────────────────────────────

function BankruptcyStep({
  state,
  onChange,
}: {
  state: AxsDeclarations;
  onChange: <K extends keyof AxsDeclarations>(key: K, value: AxsDeclarations[K]) => void;
}) {
  const isClear      = state.bankruptcyDeclaration === "clear";
  const isDischarged = state.bankruptcyDeclaration === "discharged_lt5";
  const isActive     = state.bankruptcyDeclaration === "active";

  return (
    <div className="animate-slide-in">
      <div className="flex items-center gap-3 mb-1">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{ background: "oklch(0.32 0.14 260 / 0.07)" }}
        >
          <ShieldCheck size={18} weight="duotone" className="text-brand-blue" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif", letterSpacing: "-0.04em" }}
          >
            One last step
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Help us confirm your financial standing to move forward.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Which of the following applies to you at this time?
        </label>

        <div className="flex flex-col gap-2.5">
          {/* Clear */}
          <button
            type="button"
            onClick={() => onChange("bankruptcyDeclaration", "clear")}
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

          {/* Discharged */}
          <button
            type="button"
            onClick={() => onChange("bankruptcyDeclaration", "discharged_lt5")}
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

          {/* Active */}
          <button
            type="button"
            onClick={() => onChange("bankruptcyDeclaration", "active")}
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

        {isDischarged && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50 px-4 py-3">
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-brand-blue" />
            <p className="text-sm text-brand-blue leading-snug">
              Please bring along your bankruptcy/DRS discharge letter to your appointment.
            </p>
          </div>
        )}

        {isActive && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 leading-snug">
              We are currently unable to issue loans to applicants with an active bankruptcy or DRS status.
              You cannot proceed at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────

export default function AxsPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [state, setState] = useState<AxsDeclarations>({
    moneylenderLoanAmount: "",
    moneylenderNoLoans: false,
    moneylenderPaymentHistory: "",
    bankruptcyDeclaration: "",
  });

  const onChange = useCallback(
    <K extends keyof AxsDeclarations>(key: K, value: AxsDeclarations[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Step 1 valid: no loans declared, OR amount + payment history filled
  const step1Valid =
    state.moneylenderNoLoans ||
    (state.moneylenderLoanAmount.trim() !== "" &&
      !Number.isNaN(parseInt(state.moneylenderLoanAmount, 10)) &&
      state.moneylenderPaymentHistory !== "");

  // Step 2 valid: something selected AND not active
  const step2Valid =
    state.bankruptcyDeclaration !== "" && state.bankruptcyDeclaration !== "active";

  const canProceed = step === 1 ? step1Valid : step2Valid;

  function handleNext() {
    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } else if (step2Valid) {
      router.push("/axs/offer");
    }
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }

  return (
    <div>
      <StepDots current={step} total={2} />

      {step === 1 && (
        <MoneylenderStep state={state} onChange={onChange} />
      )}
      {step === 2 && (
        <BankruptcyStep state={state} onChange={onChange} />
      )}

      <div className="mt-8 flex items-center gap-3">
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
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-blue text-sm font-semibold text-[var(--text-on-brand)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        >
          Continue
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
