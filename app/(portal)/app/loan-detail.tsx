"use client";

import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FileText,
  Percent,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { MOCK_LOANS, formatCurrency, type PaymentRecord } from "./mock-data";
import { usePortal } from "./portal-context";

function StatusBadge({ status }: { status: "active" | "overdue" | "completed" }) {
  const map = {
    active: "text-emerald-700 bg-emerald-50 border-emerald-200",
    overdue: "text-red-700 bg-red-50 border-red-200",
    completed: "text-slate-600 bg-slate-50 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize", map[status])}>
      {status}
    </span>
  );
}

function PaymentRow({ record, isLast }: { record: PaymentRecord; isLast: boolean }) {
  const iconMap = {
    paid: <CheckCircle size={16} weight="fill" className="text-emerald-500" />,
    upcoming: <Clock size={16} className="text-[var(--text-tertiary)]" />,
    overdue: <Warning size={16} weight="fill" className="text-red-500" />,
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 gap-4",
        !isLast && "border-b border-[var(--border-subtle)]"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0">{iconMap[record.status]}</span>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{record.date}</p>
          {record.reference && (
            <p className="text-xs text-[var(--text-tertiary)]">Ref: {record.reference}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold",
            record.status === "paid"
              ? "text-emerald-600"
              : record.status === "overdue"
              ? "text-red-600"
              : "text-[var(--text-primary)]"
          )}
        >
          {formatCurrency(record.amount)}
        </p>
        <p
          className={cn(
            "text-xs capitalize",
            record.status === "paid"
              ? "text-emerald-500"
              : record.status === "overdue"
              ? "text-red-500"
              : "text-[var(--text-tertiary)]"
          )}
        >
          {record.status}
        </p>
      </div>
    </div>
  );
}

export function LoanDetail() {
  const { view, goBack, navigate } = usePortal();
  if (view.type !== "loan-detail") return null;

  const loan = MOCK_LOANS.find((l) => l.loanId === view.loanId);
  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-5">
        <p className="text-[var(--text-secondary)]">Loan not found.</p>
        <button onClick={goBack} className="mt-4 text-sm text-brand-blue underline">Go back</button>
      </div>
    );
  }

  const progressPct = Math.round((loan.paymentsCompleted / loan.totalPayments) * 100);

  const infoItems = [
    { icon: <CurrencyDollar size={16} />, label: "Principal", value: formatCurrency(loan.principalAmount) },
    { icon: <Percent size={16} />, label: "Interest Rate", value: `${loan.interestRate}% p.m.` },
    { icon: <CalendarBlank size={16} />, label: "Tenure", value: `${loan.tenure} months` },
    { icon: <Clock size={16} />, label: "Start Date", value: loan.startDate },
    { icon: <CalendarBlank size={16} />, label: "End Date", value: loan.endDate },
    { icon: <CurrencyDollar size={16} />, label: "Monthly Payment", value: formatCurrency(loan.monthlyPayment) },
  ];

  const upcomingPayments = loan.paymentSchedule.filter((p) => p.status !== "paid");
  const paidPayments = loan.paymentSchedule.filter((p) => p.status === "paid").reverse();

  return (
    <div className="pb-28 lg:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 lg:px-8">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-0"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="px-5 pt-6 pb-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide font-medium mb-1">
              Loan ID
            </p>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {loan.loanId}
            </h1>
          </div>
          <StatusBadge status={loan.status} />
        </div>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">{loan.loanPurpose} loan</p>
      </div>

      <div className="px-5 sm:px-6 lg:px-8 space-y-5">
        {/* Overdue alert */}
        {loan.status === "overdue" && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 p-4">
            <Warning size={18} weight="fill" className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Payment Overdue</p>
              <p className="text-xs text-red-600 mt-0.5">
                {formatCurrency(loan.overdueAmount ?? 0)} is overdue by {loan.overdueDays} days. Please make payment immediately to avoid penalties.
              </p>
            </div>
          </div>
        )}

        {/* Outstanding balance */}
        {loan.status !== "completed" && (
          <div className="rounded-2xl bg-brand-blue p-5 text-white">
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mb-1">
              Outstanding Balance
            </p>
            <p className="font-display text-3xl font-bold mb-1">
              {formatCurrency(loan.outstandingBalance)}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs opacity-70 mb-1.5">
                <span>{loan.paymentsCompleted} payments made</span>
                <span>{loan.totalPayments - loan.paymentsCompleted} remaining</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-brand-teal"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Key details */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <h2 className="font-display text-sm font-bold text-[var(--text-primary)]">
              Loan Details
            </h2>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[var(--text-tertiary)]">{item.icon}</span>
                  <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{item.value}</span>
              </div>
            ))}
            {loan.status !== "completed" && (
              <div className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[var(--text-tertiary)]"><CurrencyDollar size={16} /></span>
                  <span className="text-sm text-[var(--text-secondary)]">Full Settlement</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(loan.fullSettlementAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Next payment */}
        {loan.status !== "completed" && (
          <div className={cn(
            "flex items-center gap-3 rounded-2xl px-5 py-4",
            loan.status === "overdue"
              ? "bg-red-50 border border-red-200"
              : "bg-amber-50 border border-amber-100"
          )}>
            <CalendarBlank size={18} className={loan.status === "overdue" ? "text-red-500" : "text-amber-500"} />
            <div>
              <p className={cn("text-sm font-semibold", loan.status === "overdue" ? "text-red-700" : "text-amber-800")}>
                {loan.status === "overdue" ? "Overdue Payment" : "Next Payment Due"}
              </p>
              <p className={cn("text-xs mt-0.5", loan.status === "overdue" ? "text-red-600" : "text-amber-700")}>
                {formatCurrency(loan.nextPaymentAmount)} · {loan.status === "overdue" ? "As soon as possible" : loan.nextPaymentDate}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {loan.status !== "completed" && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate({ type: "make-payment", loanId: loan.loanId })}
              className="flex-1 rounded-xl bg-brand-blue py-3.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Make Payment
            </button>
            <button
              onClick={() => navigate({ type: "loan-contract", loanId: loan.loanId })}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-medium)] px-4 py-3.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] active:scale-[0.98] transition-all"
            >
              <FileText size={16} />
              Contract
            </button>
          </div>
        )}

        {loan.status === "completed" && (
          <button
            onClick={() => navigate({ type: "loan-contract", loanId: loan.loanId })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] py-3.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] active:scale-[0.98] transition-all"
          >
            <FileText size={16} />
            View Loan Contract
          </button>
        )}

        {/* Payment schedule */}
        {loan.paymentSchedule.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)]">
              <h2 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Payment Schedule
              </h2>
            </div>

            {/* Upcoming / overdue */}
            {upcomingPayments.length > 0 && (
              <div className="px-5">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pt-3 pb-1">
                  Upcoming
                </p>
                {upcomingPayments.map((record, i) => (
                  <PaymentRow
                    key={record.date + i}
                    record={record}
                    isLast={i === upcomingPayments.length - 1 && paidPayments.length === 0}
                  />
                ))}
              </div>
            )}

            {/* Paid */}
            {paidPayments.length > 0 && (
              <div className="px-5">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pt-3 pb-1">
                  Paid
                </p>
                {paidPayments.map((record, i) => (
                  <PaymentRow
                    key={record.date + i}
                    record={record}
                    isLast={i === paidPayments.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
