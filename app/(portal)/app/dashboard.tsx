"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  Warning,
  CheckCircle,
  Clock,
  CurrencyDollar,
  FileText,
  Sparkle,
  Bell,
  CaretRight,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  getDaysUntil,
  getNextPaymentLoan,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  type Loan,
} from "./mock-data";
import { usePortal } from "./portal-context";

type LoanTab = "active" | "overdue" | "completed";

function LoanStatusBadge({ status }: { status: Loan["status"] }) {
  const map = {
    active: "text-emerald-700 bg-emerald-50 border-emerald-200",
    overdue: "text-red-700 bg-red-50 border-red-200",
    completed: "text-slate-600 bg-slate-50 border-slate-200",
  };
  const labels = { active: "Active", overdue: "Overdue", completed: "Completed" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", map[status])}>
      {labels[status]}
    </span>
  );
}

function LoanCard({ loan }: { loan: Loan }) {
  const { navigate } = usePortal();
  const progressPct = Math.round((loan.paymentsCompleted / loan.totalPayments) * 100);
  const daysUntil = loan.status !== "completed" ? getDaysUntil(loan.nextPaymentDate) : null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--surface-elevated)] p-5 transition-all duration-200",
        loan.status === "overdue"
          ? "border-red-200 bg-red-50/30"
          : "border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-base text-[var(--text-primary)]">
              {loan.loanId}
            </span>
            <LoanStatusBadge status={loan.status} />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">{loan.loanPurpose} loan · {loan.tenure} months</p>
        </div>
        <div className="text-right shrink-0">
          {loan.status !== "completed" ? (
            <>
              <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Outstanding</p>
              <p className="font-display font-bold text-lg text-[var(--text-primary)]">
                {formatCurrency(loan.outstandingBalance)}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle size={16} weight="fill" />
              <span className="text-xs font-semibold">Fully Paid</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mb-1.5">
          <span>{loan.paymentsCompleted} of {loan.totalPayments} payments</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              loan.status === "completed"
                ? "bg-emerald-500"
                : loan.status === "overdue"
                ? "bg-red-500"
                : "bg-brand-blue"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Next payment info */}
      {loan.status !== "completed" && (
        <div className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs",
          loan.status === "overdue"
            ? "bg-red-100 text-red-700"
            : daysUntil !== null && daysUntil <= 5
            ? "bg-amber-50 text-amber-700"
            : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
        )}>
          <CalendarBlank size={14} className="shrink-0" />
          {loan.status === "overdue" ? (
            <span>
              <span className="font-semibold">{formatCurrency(loan.overdueAmount ?? 0)}</span> overdue by {loan.overdueDays} days
            </span>
          ) : (
            <span>
              Next payment <span className="font-semibold">{formatCurrency(loan.nextPaymentAmount)}</span> due {loan.nextPaymentDate}
              {daysUntil !== null && daysUntil <= 5 && ` · in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5">
        {loan.status !== "completed" && (
          <button
            onClick={() => navigate({ type: "make-payment", loanId: loan.loanId })}
            className="flex-1 rounded-xl bg-brand-blue py-2.5 text-xs font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Pay Now
          </button>
        )}
        <button
          onClick={() => navigate({ type: "loan-detail", loanId: loan.loanId })}
          className={cn(
            "rounded-xl border border-[var(--border-medium)] py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] active:scale-[0.98] transition-all",
            loan.status === "completed" ? "flex-1" : "px-4"
          )}
        >
          View
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user, loans, applications, navigate, showToast } = usePortal();
  const [activeTab, setActiveTab] = useState<LoanTab>("active");

  const activeLoans = loans.filter((l) => l.status === "active");
  const overdueLoans = loans.filter((l) => l.status === "overdue");
  const completedLoans = loans.filter((l) => l.status === "completed");
  const nextPaymentLoan = getNextPaymentLoan(loans);

  const tabLoans: Record<LoanTab, Loan[]> = {
    active: activeLoans,
    overdue: overdueLoans,
    completed: completedLoans,
  };

  const tabs: { key: LoanTab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: activeLoans.length },
    { key: "overdue", label: "Overdue", count: overdueLoans.length },
    { key: "completed", label: "Completed", count: completedLoans.length },
  ];

  const today = new Date().toLocaleDateString("en-SG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="pb-28 lg:pb-10">
      {/* Welcome header */}
      <div className="px-5 pt-6 pb-5 sm:px-6 lg:px-8">
        <p className="text-xs text-[var(--text-tertiary)] mb-0.5">{today}</p>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Welcome back, {user?.firstName} 👋
        </h1>
      </div>

      <div className="px-5 sm:px-6 lg:px-8 space-y-6">
        {/* Next Payment Reminder */}
        {nextPaymentLoan && (
          <div
            className={cn(
              "rounded-2xl p-5 animate-fade-up",
              nextPaymentLoan.status === "overdue"
                ? "bg-red-600 text-white"
                : "bg-brand-blue text-white"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {nextPaymentLoan.status === "overdue" ? (
                    <Warning size={17} weight="fill" className="text-red-200 shrink-0" />
                  ) : (
                    <Bell size={17} weight="fill" className="text-blue-200 shrink-0" />
                  )}
                  <span className="text-xs font-semibold opacity-80 uppercase tracking-wide">
                    {nextPaymentLoan.status === "overdue" ? "Payment Overdue" : "Upcoming Payment"}
                  </span>
                </div>

                <p className="text-3xl font-display font-bold mb-1">
                  {formatCurrency(
                    nextPaymentLoan.status === "overdue"
                      ? (nextPaymentLoan.overdueAmount ?? 0)
                      : nextPaymentLoan.nextPaymentAmount
                  )}
                </p>

                <p className="text-sm opacity-80">
                  {nextPaymentLoan.status === "overdue" ? (
                    <>Loan <span className="font-semibold">{nextPaymentLoan.loanId}</span> · {nextPaymentLoan.overdueDays} days overdue</>
                  ) : (
                    <>Loan <span className="font-semibold">{nextPaymentLoan.loanId}</span> · Due {nextPaymentLoan.nextPaymentDate}</>
                  )}
                </p>
              </div>

              <button
                onClick={() => navigate({ type: "make-payment", loanId: nextPaymentLoan.loanId })}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
                  nextPaymentLoan.status === "overdue"
                    ? "bg-white text-red-600 hover:bg-red-50"
                    : "bg-white text-brand-blue hover:bg-blue-50"
                )}
              >
                Pay Now
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* CFOne Marketing Card */}
        <div
          className="rounded-2xl overflow-hidden border border-brand-teal/30 animate-fade-up"
          style={{ animationDelay: "0.05s" }}
        >
          <div
            className="relative p-5"
            style={{
              background: "linear-gradient(135deg, oklch(0.22 0.10 260) 0%, oklch(0.32 0.14 260) 50%, oklch(0.28 0.12 200) 100%)",
            }}
          >
            <div className="absolute top-3 right-3">
              <span className="rounded-full bg-brand-teal/20 border border-brand-teal/30 px-2.5 py-1 text-xs font-bold text-brand-teal uppercase tracking-wide">
                New
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/20 border border-brand-teal/30">
                <Sparkle size={20} weight="fill" className="text-brand-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-white text-lg leading-tight mb-1">
                  CFOne Loan
                </p>
                <p className="text-sm text-white/70 mb-3 leading-relaxed">
                  Singapore&apos;s lowest interest rate from <span className="text-brand-teal font-bold">1% p.a.</span> — exclusively for existing customers.
                </p>
                <button
                  onClick={() => showToast("Redirecting to eligibility check — feature coming soon!")}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-teal px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  Check Eligibility
                  <ArrowUpRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Tabs */}
        <div className="animate-fade-up" style={{ animationDelay: "0.10s" }}>
          <h2 className="font-display text-base font-bold text-[var(--text-primary)] mb-3">
            My Loans
          </h2>

          {/* Tab bar */}
          <div className="flex rounded-xl bg-[var(--surface-secondary)] p-1 mb-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      activeTab === tab.key
                        ? tab.key === "overdue"
                          ? "bg-red-100 text-red-700"
                          : tab.key === "completed"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-blue-100 text-blue-700"
                        : "bg-[var(--border-subtle)] text-[var(--text-tertiary)]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loan cards */}
          <div className="space-y-3">
            {tabLoans[activeTab].length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle size={40} className="text-[var(--border-medium)] mb-3" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {activeTab === "overdue" ? "No overdue payments" : `No ${activeTab} loans`}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {activeTab === "completed"
                    ? "Your completed loans will appear here"
                    : "Great job keeping up with your payments!"}
                </p>
              </div>
            ) : (
              tabLoans[activeTab].map((loan) => (
                <LoanCard key={loan.loanId} loan={loan} />
              ))
            )}
          </div>
        </div>

        {/* Applications */}
        {applications.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-display text-base font-bold text-[var(--text-primary)] mb-3">
              Loan Applications
            </h2>
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.applicationId}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={15} className="text-[var(--text-tertiary)]" />
                        <span className="text-xs text-[var(--text-tertiary)] font-medium">
                          {app.applicationId}
                        </span>
                      </div>
                      <p className="font-display font-bold text-[var(--text-primary)]">
                        {formatCurrency(app.amount)}
                        <span className="text-sm font-normal text-[var(--text-tertiary)] ml-1">
                          · {app.tenure} months
                        </span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0",
                        APPLICATION_STATUS_COLORS[app.status]
                      )}
                    >
                      {APPLICATION_STATUS_LABELS[app.status]}
                    </span>
                  </div>

                  {app.remarks && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 mt-3">
                      <Warning size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800">{app.remarks}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-tertiary)]">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>Submitted {app.submittedDate}</span>
                    </div>
                    <span>·</span>
                    <span>Updated {app.lastUpdated}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="animate-fade-up" style={{ animationDelay: "0.20s" }}>
          <h2 className="font-display text-base font-bold text-[var(--text-primary)] mb-3">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: <CurrencyDollar size={20} />,
                label: "Make a Payment",
                sub: "PayNow or Cash",
                action: () => loans.length > 0
                  ? navigate({ type: "make-payment", loanId: loans.find(l => l.status !== "completed")?.loanId ?? loans[0].loanId })
                  : showToast("No active loans to pay"),
              },
              {
                icon: <FileText size={20} />,
                label: "View Contracts",
                sub: "All loan documents",
                action: () => loans.length > 0
                  ? navigate({ type: "loan-detail", loanId: loans[0].loanId })
                  : showToast("No loans found"),
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-left hover:border-[var(--border-medium)] hover:shadow-sm active:scale-[0.98] transition-all"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{item.sub}</p>
                </div>
                <CaretRight size={14} className="text-[var(--text-tertiary)] self-end mt-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
