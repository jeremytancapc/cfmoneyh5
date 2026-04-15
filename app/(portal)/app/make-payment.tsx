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

type PayStep = "amount" | "method" | "paynow-qr" | "cash-qr";
type AmountOption = "outstanding" | "settlement" | "custom";
type PayMethod = "paynow" | "cash";

export function MakePayment() {
  const { view, goBack, navigate } = usePortal();
  if (view.type !== "make-payment") return null;

  const loan = MOCK_LOANS.find((l) => l.loanId === view.loanId);
  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-5">
        <p className="text-[var(--text-secondary)]">Loan not found.</p>
        <button onClick={goBack} className="mt-4 text-sm text-brand-blue underline">Go back</button>
      </div>
    );
  }

  return <PaymentWizard loan={loan} onBack={goBack} onDone={() => navigate({ type: "dashboard" })} />;
}

function PaymentWizard({
  loan,
  onBack,
  onDone,
}: {
  loan: ReturnType<typeof MOCK_LOANS.find> & object;
  onBack: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<PayStep>("amount");
  const [amountOption, setAmountOption] = useState<AmountOption>("outstanding");
  const [customAmount, setCustomAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("paynow");
  const [customAmountError, setCustomAmountError] = useState("");

  if (!loan) return null;

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
      if (val > loan!.outstandingBalance) {
        setCustomAmountError(`Amount cannot exceed outstanding balance of ${formatCurrency(loan!.outstandingBalance)}.`);
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

  return (
    <div className="pb-28 lg:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 lg:px-8">
        <button
          onClick={step === "amount" ? onBack : () => setStep(step === "method" ? "amount" : "method")}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="px-5 pt-6 sm:px-6 lg:px-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {(["amount", "method", step === "paynow-qr" ? "paynow-qr" : "cash-qr"] as const).map((s, i) => {
            const steps: PayStep[] = ["amount", "method", step === "cash-qr" ? "cash-qr" : "paynow-qr"];
            const currentIdx = steps.indexOf(step);
            const isActive = s === step;
            const isComplete = steps.indexOf(s) < currentIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={cn("h-px flex-1 min-w-[20px]", isComplete ? "bg-brand-blue" : "bg-[var(--border-subtle)]")} />}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                    isComplete
                      ? "bg-brand-blue text-white"
                      : isActive
                      ? "bg-brand-blue text-white"
                      : "bg-[var(--surface-secondary)] text-[var(--text-tertiary)] border border-[var(--border-medium)]"
                  )}
                >
                  {isComplete ? <CheckCircle size={14} weight="fill" /> : i + 1}
                </div>
              </div>
            );
          })}
        </div>

        <h1 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">
          {stepTitles[step]}
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mb-6">
          Loan ID: <span className="font-semibold text-[var(--text-secondary)]">{loan.loanId}</span>
        </p>

        {/* ── Step 1: Amount ── */}
        {step === "amount" && (
          <div className="space-y-4 animate-fade-up">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Pay to
                </p>
                <p className="font-display font-bold text-[var(--text-primary)] mt-0.5">
                  CF Money · Loan {loan.loanId}
                </p>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {/* Option 1 */}
                <label className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors"
                    style={{
                      borderColor: amountOption === "outstanding" ? "var(--brand-blue-hex)" : "var(--border-medium)",
                      background: amountOption === "outstanding" ? "var(--brand-blue-hex)" : "transparent",
                    }}
                  >
                    {amountOption === "outstanding" && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <input
                    type="radio"
                    className="sr-only"
                    checked={amountOption === "outstanding"}
                    onChange={() => setAmountOption("outstanding")}
                  />
                  <div className="flex-1 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Pay outstanding</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Current month&apos;s payment due</p>
                    </div>
                    <p className="font-display font-bold text-[var(--text-primary)] shrink-0">
                      {formatCurrency(loan.nextPaymentAmount)}
                    </p>
                  </div>
                </label>

                {/* Option 2 */}
                <label className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors"
                    style={{
                      borderColor: amountOption === "settlement" ? "var(--brand-blue-hex)" : "var(--border-medium)",
                      background: amountOption === "settlement" ? "var(--brand-blue-hex)" : "transparent",
                    }}
                  >
                    {amountOption === "settlement" && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <input
                    type="radio"
                    className="sr-only"
                    checked={amountOption === "settlement"}
                    onChange={() => setAmountOption("settlement")}
                  />
                  <div className="flex-1 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Full settlement</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Pay off entire loan balance</p>
                    </div>
                    <p className="font-display font-bold text-[var(--text-primary)] shrink-0">
                      {formatCurrency(loan.fullSettlementAmount)}
                    </p>
                  </div>
                </label>

                {/* Option 3 */}
                <label className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors"
                    style={{
                      borderColor: amountOption === "custom" ? "var(--brand-blue-hex)" : "var(--border-medium)",
                      background: amountOption === "custom" ? "var(--brand-blue-hex)" : "transparent",
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
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Pay other amount</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Enter a custom amount</p>
                    {amountOption === "custom" && (
                      <div className="mt-3 animate-fade-up">
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
                            className="flex-1 h-11 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                          />
                        </div>
                        {customAmountError && (
                          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
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

            {/* Total */}
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-5 py-3.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Total amount</span>
              <span className="font-display text-xl font-bold text-[var(--text-primary)]">
                {resolvedAmount > 0 ? formatCurrency(resolvedAmount) : "—"}
              </span>
            </div>

            <button
              onClick={handleAmountNext}
              disabled={amountOption === "custom" && !customAmount}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold transition-all duration-200",
                "bg-brand-blue text-white hover:opacity-90 active:scale-[0.98]",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Next
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        )}

        {/* ── Step 2: Method ── */}
        {step === "method" && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-5 py-3 mb-2">
              <span className="text-sm text-[var(--text-secondary)]">Amount to pay</span>
              <span className="font-display font-bold text-[var(--text-primary)]">{formatCurrency(resolvedAmount)}</span>
            </div>

            <div className="space-y-3">
              {/* PayNow */}
              <button
                onClick={() => setPayMethod("paynow")}
                className={cn(
                  "w-full flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-[0.98]",
                  payMethod === "paynow"
                    ? "border-brand-blue bg-blue-50/50"
                    : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-medium)]"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  payMethod === "paynow" ? "bg-brand-blue/10" : "bg-[var(--surface-secondary)]"
                )}>
                  <QrCode size={22} className={payMethod === "paynow" ? "text-brand-blue" : "text-[var(--text-tertiary)]"} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">PayNow</p>
                    <span className="rounded-full bg-brand-teal/20 border border-brand-teal/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Instant transfer via PayNow QR. Credited within minutes.
                  </p>
                </div>
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                  payMethod === "paynow" ? "border-brand-blue bg-brand-blue" : "border-[var(--border-medium)]"
                )}>
                  {payMethod === "paynow" && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>

              {/* Cash */}
              <button
                onClick={() => setPayMethod("cash")}
                className={cn(
                  "w-full flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-[0.98]",
                  payMethod === "cash"
                    ? "border-brand-blue bg-blue-50/50"
                    : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-medium)]"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  payMethod === "cash" ? "bg-brand-blue/10" : "bg-[var(--surface-secondary)]"
                )}>
                  <CurrencyDollar size={22} className={payMethod === "cash" ? "text-brand-blue" : "text-[var(--text-tertiary)]"} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Pay by Cash</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Visit our office and pay with cash. Bring this QR code with you.
                  </p>
                </div>
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                  payMethod === "cash" ? "border-brand-blue bg-brand-blue" : "border-[var(--border-medium)]"
                )}>
                  {payMethod === "cash" && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            <button
              onClick={handleMethodNext}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-4 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Continue
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        )}

        {/* ── Step 3a: PayNow QR ── */}
        {step === "paynow-qr" && (
          <PayNowQR loan={loan} amount={resolvedAmount} onDone={onDone} />
        )}

        {/* ── Step 3b: Cash QR ── */}
        {step === "cash-qr" && (
          <CashQR loan={loan} amount={resolvedAmount} onDone={onDone} />
        )}
      </div>
    </div>
  );
}

function PayNowQR({
  loan,
  amount,
  onDone,
}: {
  loan: NonNullable<ReturnType<typeof MOCK_LOANS.find>>;
  amount: number;
  onDone: () => void;
}) {
  return (
    <div className="animate-fade-up space-y-5">
      {/* Amount summary */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Amount</span>
          <span className="font-display text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--text-tertiary)]">Payment reference</span>
          <span className="text-xs font-semibold font-mono text-[var(--text-secondary)]">{loan.loanId}</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center rounded-2xl border-2 border-brand-blue/20 bg-[var(--surface-elevated)] p-6">
        <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-4">
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
            <div className="text-center bg-white rounded-xl px-4 py-3 shadow-sm border border-[var(--border-subtle)]">
              <QrCode size={28} className="text-brand-blue mx-auto mb-1" />
              <p className="text-xs font-bold text-[var(--text-primary)]">PayNow QR</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{loan.loanId}</p>
            </div>
          </div>
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-2 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
          <Clock size={15} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800">
            This QR code will expire in <span className="font-bold">24 hours</span>
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-brand-blue shrink-0" />
          <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
            How to pay
          </p>
        </div>
        <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
          {[
            "Open your banking app and select PayNow.",
            "Tap \"Scan QR\" and scan the code above.",
            `Verify the amount: ${formatCurrency(amount)}.`,
            "Confirm payment — funds reflect within 5 minutes.",
            "Keep your transaction reference for records.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue font-bold text-[10px] mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-xl bg-brand-blue py-4 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
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
  loan: NonNullable<ReturnType<typeof MOCK_LOANS.find>>;
  amount: number;
  onDone: () => void;
}) {
  return (
    <div className="animate-fade-up space-y-5">
      {/* Amount summary */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Amount</span>
          <span className="font-display text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--text-tertiary)]">Payment reference</span>
          <span className="text-xs font-semibold font-mono text-[var(--text-secondary)]">{loan.loanId}</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center rounded-2xl border-2 border-[var(--border-medium)] bg-[var(--surface-elevated)] p-6">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
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
            <div className="text-center bg-white rounded-xl px-4 py-3 shadow-sm border border-[var(--border-subtle)]">
              <Buildings size={28} className="text-[var(--text-secondary)] mx-auto mb-1" />
              <p className="text-xs font-bold text-[var(--text-primary)]">Cash Payment</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{loan.loanId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Office info */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <MapPin size={15} className="text-brand-blue shrink-0" />
          <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
            Our Office
          </p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">CF Money Pte. Ltd.</p>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">
              10 Anson Road, #26-08 International Plaza<br />
              Singapore 079903
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-[var(--text-secondary)] mb-0.5">Office Hours</p>
              <p className="text-[var(--text-tertiary)]">Mon – Fri: 10am – 7pm</p>
              <p className="text-[var(--text-tertiary)]">Sat: 10am – 3pm</p>
              <p className="text-[var(--text-tertiary)]">Sun & PH: Closed</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-secondary)] mb-0.5">Contact</p>
              <p className="text-[var(--text-tertiary)]">+65 6777 8080</p>
              <p className="text-[var(--text-tertiary)]">hellosg@crawfort.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash payment instructions */}
      <div className="rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-brand-blue shrink-0" />
          <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
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
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue font-bold text-[10px] mt-0.5">
                {i + 1}
              </span>
              {instruction}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        <Warning size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p>Please arrive at least 30 minutes before closing time. Late arrivals may not be served on the same day.</p>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-xl bg-brand-blue py-4 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
