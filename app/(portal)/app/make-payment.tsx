"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Info,
  MapPin,
  QrCode,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { MOCK_LOANS, formatCurrency } from "./mock-data";
import { usePortal } from "./portal-context";
import { PageHeader, Workspace } from "./portal-layout";

type PayStep = "amount" | "method" | "paynow-qr" | "cash-qr";
type AmountOption = "outstanding" | "settlement" | "custom";
type PayMethod = "paynow" | "cash";

type Loan = NonNullable<ReturnType<typeof MOCK_LOANS.find>>;

export function MakePayment() {
  const { view, goBack, navigate } = usePortal();
  if (view.type !== "make-payment") return null;

  const loan = MOCK_LOANS.find((l) => l.loanId === view.loanId);
  if (!loan) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
        <p className="text-[var(--text-secondary)]">Loan not found.</p>
        <button
          onClick={goBack}
          className="mt-4 text-sm text-brand-blue underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <PaymentWizard
      loan={loan}
      onBack={goBack}
      onDone={() => navigate({ type: "dashboard" })}
    />
  );
}

function PaymentWizard({
  loan,
  onBack,
  onDone,
}: {
  loan: Loan;
  onBack: () => void;
  onDone: () => void;
}) {
  const { navigate } = usePortal();
  const [step, setStep] = useState<PayStep>("amount");
  const [amountOption, setAmountOption] = useState<AmountOption>("outstanding");
  const [customAmount, setCustomAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("paynow");
  const [customAmountError, setCustomAmountError] = useState("");

  const resolvedAmount =
    amountOption === "outstanding"
      ? loan.nextPaymentAmount
      : amountOption === "settlement"
      ? loan.fullSettlementAmount
      : parseFloat(customAmount) || 0;

  function handleAmountNext() {
    if (amountOption === "custom") {
      const val = parseFloat(customAmount);
      if (!val || val <= 0) {
        setCustomAmountError("Please enter a valid amount.");
        return;
      }
      if (val > loan.outstandingBalance) {
        setCustomAmountError(
          `Amount cannot exceed outstanding balance of ${formatCurrency(
            loan.outstandingBalance
          )}.`
        );
        return;
      }
    }
    setCustomAmountError("");
    setStep("method");
  }

  function handleMethodNext() {
    setStep(payMethod === "paynow" ? "paynow-qr" : "cash-qr");
  }

  const stepTitles: Record<PayStep, string> = {
    amount: "Select Amount",
    method: "Payment Method",
    "paynow-qr": "PayNow QR Code",
    "cash-qr": "Pay by Cash",
  };

  const stepSubtitles: Record<PayStep, string> = {
    amount: "Choose how much you want to pay today.",
    method: "Select how you'd like to settle this payment.",
    "paynow-qr": "Scan this QR code with any PayNow-enabled banking app.",
    "cash-qr": "Visit our office with this QR code to pay in cash.",
  };

  const StepIndicator = (
    <div className="flex items-center gap-2">
      {(
        [
          "amount",
          "method",
          step === "paynow-qr" ? "paynow-qr" : "cash-qr",
        ] as const
      ).map((s, i) => {
        const steps: PayStep[] = [
          "amount",
          "method",
          step === "cash-qr" ? "cash-qr" : "paynow-qr",
        ];
        const currentIdx = steps.indexOf(step);
        const isActive = s === step;
        const isComplete = steps.indexOf(s) < currentIdx;
        return (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px min-w-[20px] flex-1",
                  isComplete ? "bg-brand-blue" : "bg-[var(--border-subtle)]"
                )}
              />
            )}
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isComplete
                  ? "bg-brand-blue text-white"
                  : isActive
                  ? "bg-brand-blue text-white"
                  : "border border-[var(--border-medium)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
              )}
            >
              {isComplete ? <CheckCircle size={14} weight="fill" /> : i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );

  const StepBody = (
    <>
      {step === "amount" && (
        <StepAmount
          loan={loan}
          amountOption={amountOption}
          setAmountOption={setAmountOption}
          customAmount={customAmount}
          setCustomAmount={setCustomAmount}
          customAmountError={customAmountError}
          setCustomAmountError={setCustomAmountError}
          resolvedAmount={resolvedAmount}
          onNext={handleAmountNext}
        />
      )}
      {step === "method" && (
        <StepMethod
          resolvedAmount={resolvedAmount}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          onNext={handleMethodNext}
        />
      )}
      {step === "paynow-qr" && (
        <PayNowQR loan={loan} amount={resolvedAmount} onDone={onDone} />
      )}
      {step === "cash-qr" && (
        <CashQR loan={loan} amount={resolvedAmount} onDone={onDone} />
      )}
    </>
  );

  return (
    <>
      {/* ─── Mobile view (unchanged) ─────────────────────────────── */}
      <div className="pb-28 lg:hidden">
        <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-4 sm:px-6">
          <button
            onClick={
              step === "amount"
                ? onBack
                : () =>
                    setStep(step === "method" ? "amount" : "method")
            }
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="px-5 pt-6 sm:px-6">
          <div className="mb-5">{StepIndicator}</div>
          <h1 className="mb-1 font-display text-xl font-bold text-[var(--text-primary)]">
            {stepTitles[step]}
          </h1>
          <p className="mb-6 text-sm text-[var(--text-tertiary)]">
            Loan ID:{" "}
            <span className="font-semibold text-[var(--text-secondary)]">
              {loan.loanId}
            </span>
          </p>
          {StepBody}
        </div>
      </div>

      {/* ─── Desktop view ────────────────────────────────────────── */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", onClick: () => navigate({ type: "dashboard" }) },
          {
            label: `Loan ${loan.loanId}`,
            onClick: () =>
              navigate({ type: "loan-detail", loanId: loan.loanId }),
          },
          { label: "Make a payment" },
        ]}
        eyebrow={`Loan ${loan.loanId}`}
        title={stepTitles[step]}
        subtitle={stepSubtitles[step]}
        actions={
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={14} />
            Cancel
          </button>
        }
      />

      <Workspace
        primary={
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-6 py-5">
              {StepIndicator}
            </div>
            <div className="animate-fade-up">{StepBody}</div>
          </div>
        }
        rail={
          <PaymentSummaryRail
            loan={loan}
            step={step}
            amountOption={amountOption}
            payMethod={payMethod}
            resolvedAmount={resolvedAmount}
          />
        }
      />
    </>
  );
}

// ─── Step components ─────────────────────────────────────────────────

function StepAmount({
  loan,
  amountOption,
  setAmountOption,
  customAmount,
  setCustomAmount,
  customAmountError,
  setCustomAmountError,
  resolvedAmount,
  onNext,
}: {
  loan: Loan;
  amountOption: AmountOption;
  setAmountOption: (v: AmountOption) => void;
  customAmount: string;
  setCustomAmount: (v: string) => void;
  customAmountError: string;
  setCustomAmountError: (v: string) => void;
  resolvedAmount: number;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Pay to
          </p>
          <p className="mt-0.5 font-display font-bold text-[var(--text-primary)]">
            CF Money · Loan {loan.loanId}
          </p>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          <AmountOptionRow
            selected={amountOption === "outstanding"}
            onSelect={() => setAmountOption("outstanding")}
            title="Pay outstanding"
            sub="Current month's payment due"
            amount={formatCurrency(loan.nextPaymentAmount)}
          />
          <AmountOptionRow
            selected={amountOption === "settlement"}
            onSelect={() => setAmountOption("settlement")}
            title="Full settlement"
            sub="Pay off entire loan balance"
            amount={formatCurrency(loan.fullSettlementAmount)}
          />
          <label className="flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-secondary)]">
            <div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              style={{
                borderColor:
                  amountOption === "custom"
                    ? "var(--brand-blue-hex)"
                    : "var(--border-medium)",
                background:
                  amountOption === "custom"
                    ? "var(--brand-blue-hex)"
                    : "transparent",
              }}
            >
              {amountOption === "custom" && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <input
              type="radio"
              className="sr-only"
              checked={amountOption === "custom"}
              onChange={() => setAmountOption("custom")}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Pay other amount
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                Enter a custom amount
              </p>
              {amountOption === "custom" && (
                <div className="animate-fade-up mt-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-11 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--surface-secondary)] px-3 text-sm font-semibold text-[var(--text-secondary)]">
                      SGD
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setCustomAmountError("");
                      }}
                      placeholder="0.00"
                      className="h-11 flex-1 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)] focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                    />
                  </div>
                  {customAmountError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                      <Warning size={12} />
                      {customAmountError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-3.5">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Total amount
        </span>
        <span className="font-display text-xl font-bold text-[var(--text-primary)]">
          {resolvedAmount > 0 ? formatCurrency(resolvedAmount) : "—"}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={amountOption === "custom" && !customAmount}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold transition-all duration-200",
          "bg-brand-blue text-white hover:opacity-90 active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        Next
        <ArrowRight size={16} weight="bold" />
      </button>
    </div>
  );
}

function AmountOptionRow({
  selected,
  onSelect,
  title,
  sub,
  amount,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  amount: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-secondary)]">
      <div
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: selected
            ? "var(--brand-blue-hex)"
            : "var(--border-medium)",
          background: selected ? "var(--brand-blue-hex)" : "transparent",
        }}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <input
        type="radio"
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />
      <div className="flex flex-1 items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{sub}</p>
        </div>
        <p className="shrink-0 font-display font-bold text-[var(--text-primary)]">
          {amount}
        </p>
      </div>
    </label>
  );
}

function StepMethod({
  resolvedAmount,
  payMethod,
  setPayMethod,
  onNext,
}: {
  resolvedAmount: number;
  payMethod: PayMethod;
  setPayMethod: (m: PayMethod) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-3">
        <span className="text-sm text-[var(--text-secondary)]">
          Amount to pay
        </span>
        <span className="font-display font-bold text-[var(--text-primary)]">
          {formatCurrency(resolvedAmount)}
        </span>
      </div>

      <div className="space-y-3">
        <MethodCard
          selected={payMethod === "paynow"}
          onSelect={() => setPayMethod("paynow")}
          icon={<QrCode size={22} />}
          title="PayNow"
          badge="Recommended"
          description="Instant transfer via PayNow QR. Credited within minutes."
        />
        <MethodCard
          selected={payMethod === "cash"}
          onSelect={() => setPayMethod("cash")}
          icon={<CurrencyDollar size={22} />}
          title="Pay by Cash"
          description="Visit our office and pay with cash. Bring this QR code with you."
        />
      </div>

      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Continue
        <ArrowRight size={16} weight="bold" />
      </button>
    </div>
  );
}

function MethodCard({
  selected,
  onSelect,
  icon,
  title,
  badge,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-[0.98]",
        selected
          ? "border-brand-blue bg-blue-50/50"
          : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-medium)]"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-brand-blue/10" : "bg-[var(--surface-secondary)]"
        )}
      >
        <span
          className={
            selected ? "text-brand-blue" : "text-[var(--text-tertiary)]"
          }
        >
          {icon}
        </span>
      </div>
      <div className="flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </p>
          {badge && (
            <span className="rounded-full border border-brand-teal/30 bg-brand-teal/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
      </div>
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-brand-blue bg-brand-blue" : "border-[var(--border-medium)]"
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

function PayNowQR({
  loan,
  amount,
  onDone,
}: {
  loan: Loan;
  amount: number;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Amount
          </span>
          <span className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(amount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">
            Payment reference
          </span>
          <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">
            {loan.loanId}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center rounded-2xl border-2 border-brand-blue/20 bg-[var(--surface-elevated)] p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-blue">
          Scan with any PayNow app
        </p>
        <div className="relative">
          <Image
            src="/images/qr-placeholder.png"
            alt="PayNow QR Code"
            width={200}
            height={200}
            className="rounded-xl"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-center shadow-sm">
              <QrCode size={28} className="mx-auto mb-1 text-brand-blue" />
              <p className="text-xs font-bold text-[var(--text-primary)]">
                PayNow QR
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {loan.loanId}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <Clock size={15} className="shrink-0 text-amber-500" />
          <p className="text-xs text-amber-800">
            This QR code will expire in <span className="font-bold">24 hours</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info size={15} className="shrink-0 text-brand-blue" />
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
            How to pay
          </p>
        </div>
        <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
          {[
            "Open your banking app and select PayNow.",
            'Tap "Scan QR" and scan the code above.',
            `Verify the amount: ${formatCurrency(amount)}.`,
            "Confirm payment — funds reflect within 5 minutes.",
            "Keep your transaction reference for records.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-xl bg-brand-blue py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function CashQR({
  loan,
  amount,
  onDone,
}: {
  loan: Loan;
  amount: number;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Amount
          </span>
          <span className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(amount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">
            Payment reference
          </span>
          <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">
            {loan.loanId}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center rounded-2xl border-2 border-[var(--border-medium)] bg-[var(--surface-elevated)] p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Show this QR at our office
        </p>
        <div className="relative">
          <Image
            src="/images/qr-placeholder.png"
            alt="Cash Payment QR Code"
            width={200}
            height={200}
            className="rounded-xl"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-center shadow-sm">
              <Buildings
                size={28}
                className="mx-auto mb-1 text-[var(--text-secondary)]"
              />
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Cash Payment
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {loan.loanId}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-3.5">
          <MapPin size={15} className="shrink-0 text-brand-blue" />
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
            Our Office
          </p>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              CF Money Pte. Ltd.
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              10 Anson Road, #26-08 International Plaza
              <br />
              Singapore 079903
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="mb-0.5 font-semibold text-[var(--text-secondary)]">
                Office Hours
              </p>
              <p className="text-[var(--text-tertiary)]">Mon – Fri: 10am – 7pm</p>
              <p className="text-[var(--text-tertiary)]">Sat: 10am – 3pm</p>
              <p className="text-[var(--text-tertiary)]">Sun & PH: Closed</p>
            </div>
            <div>
              <p className="mb-0.5 font-semibold text-[var(--text-secondary)]">
                Contact
              </p>
              <p className="text-[var(--text-tertiary)]">+65 6777 8080</p>
              <p className="text-[var(--text-tertiary)]">hellosg@crawfort.com</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info size={15} className="shrink-0 text-brand-blue" />
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
            Instructions
          </p>
        </div>
        <ol className="space-y-2.5 text-xs text-[var(--text-secondary)]">
          {[
            "Visit our office during operating hours.",
            "Show this QR code or provide your Loan ID to our cashier.",
            `Prepare ${formatCurrency(amount)} in cash.`,
            "Our cashier will issue you a payment receipt — keep it safe.",
            "Cash payment will be reflected in your account within 1 business day.",
          ].map((instruction, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
                {i + 1}
              </span>
              {instruction}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Warning size={15} className="mt-0.5 shrink-0 text-amber-500" />
        <p>
          Please arrive at least 30 minutes before closing time. Late arrivals
          may not be served on the same day.
        </p>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-xl bg-brand-blue py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

// ─── Desktop-only summary rail ──────────────────────────────────────

function PaymentSummaryRail({
  loan,
  step,
  amountOption,
  payMethod,
  resolvedAmount,
}: {
  loan: Loan;
  step: PayStep;
  amountOption: AmountOption;
  payMethod: PayMethod;
  resolvedAmount: number;
}) {
  const amountLabel =
    amountOption === "outstanding"
      ? "This month"
      : amountOption === "settlement"
      ? "Full settlement"
      : "Custom amount";

  const stepLabel: Record<PayStep, string> = {
    amount: "1 of 3 · Amount",
    method: "2 of 3 · Method",
    "paynow-qr": "3 of 3 · PayNow",
    "cash-qr": "3 of 3 · Cash",
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        <div className="bg-brand-blue px-5 py-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
            Payment summary
          </p>
          <p className="mt-1 font-display text-2xl font-bold leading-none">
            {resolvedAmount > 0 ? formatCurrency(resolvedAmount) : "—"}
          </p>
          <p className="mt-2 text-xs opacity-80">{stepLabel[step]}</p>
        </div>
        <div className="divide-y divide-[var(--border-subtle)] text-sm">
          <SummaryRow label="Loan" value={loan.loanId} mono />
          <SummaryRow label="Purpose" value={loan.loanPurpose} />
          <SummaryRow
            label="Outstanding"
            value={formatCurrency(loan.outstandingBalance)}
          />
          {step !== "amount" && (
            <SummaryRow label="Amount type" value={amountLabel} />
          )}
          {(step === "paynow-qr" || step === "cash-qr") && (
            <SummaryRow
              label="Method"
              value={payMethod === "paynow" ? "PayNow" : "Cash at office"}
            />
          )}
          <SummaryRow label="Reference" value={loan.loanId} mono />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          Good to know
        </p>
        <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
          <li className="flex items-start gap-2">
            <CheckCircle
              size={14}
              weight="fill"
              className="mt-0.5 shrink-0 text-emerald-500"
            />
            PayNow transfers are credited within 5 minutes during banking hours.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle
              size={14}
              weight="fill"
              className="mt-0.5 shrink-0 text-emerald-500"
            />
            No early-repayment penalty on settlement.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle
              size={14}
              weight="fill"
              className="mt-0.5 shrink-0 text-emerald-500"
            />
            You'll receive a receipt via email after the payment clears.
          </li>
        </ul>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold text-[var(--text-primary)]",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  );
}
