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
  Headset,
  Plus,
  Download,
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
import { PageHeader, Workspace } from "./portal-layout";

type LoanTab = "active" | "overdue" | "completed";

function LoanStatusBadge({ status }: { status: Loan["status"] }) {
  const map = {
    active: "text-emerald-700 bg-emerald-50 border-emerald-200",
    overdue: "text-red-700 bg-red-50 border-red-200",
    completed: "text-slate-600 bg-slate-50 border-slate-200",
  };
  const labels = { active: "Active", overdue: "Overdue", completed: "Completed" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        map[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

function LoanCard({ loan }: { loan: Loan }) {
  const { navigate } = usePortal();
  const progressPct = Math.round(
    (loan.paymentsCompleted / loan.totalPayments) * 100
  );
  const daysUntil =
    loan.status !== "completed" ? getDaysUntil(loan.nextPaymentDate) : null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--surface-elevated)] p-5 transition-all duration-200",
        loan.status === "overdue"
          ? "border-red-200 bg-red-50/30"
          : "border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:shadow-sm"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-display text-base font-bold text-[var(--text-primary)]">
              {loan.loanId}
            </span>
            <LoanStatusBadge status={loan.status} />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {loan.loanPurpose} loan · {loan.tenure} months
          </p>
        </div>
        <div className="shrink-0 text-right">
          {loan.status !== "completed" ? (
            <>
              <p className="mb-0.5 text-xs text-[var(--text-tertiary)]">
                Outstanding
              </p>
              <p className="font-display text-lg font-bold text-[var(--text-primary)]">
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

      <div className="mb-3">
        <div className="mb-1.5 flex justify-between text-xs text-[var(--text-tertiary)]">
          <span>
            {loan.paymentsCompleted} of {loan.totalPayments} payments
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
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

      {loan.status !== "completed" && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
            loan.status === "overdue"
              ? "bg-red-100 text-red-700"
              : daysUntil !== null && daysUntil <= 5
              ? "bg-amber-50 text-amber-700"
              : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
          )}
        >
          <CalendarBlank size={14} className="shrink-0" />
          {loan.status === "overdue" ? (
            <span>
              <span className="font-semibold">
                {formatCurrency(loan.overdueAmount ?? 0)}
              </span>{" "}
              overdue by {loan.overdueDays} days
            </span>
          ) : (
            <span>
              Next payment{" "}
              <span className="font-semibold">
                {formatCurrency(loan.nextPaymentAmount)}
              </span>{" "}
              due {loan.nextPaymentDate}
              {daysUntil !== null &&
                daysUntil <= 5 &&
                ` · in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2.5">
        {loan.status !== "completed" && (
          <button
            onClick={() =>
              navigate({ type: "make-payment", loanId: loan.loanId })
            }
            className="flex-1 rounded-xl bg-brand-blue py-2.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Pay Now
          </button>
        )}
        <button
          onClick={() => navigate({ type: "loan-detail", loanId: loan.loanId })}
          className={cn(
            "rounded-xl border border-[var(--border-medium)] py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-secondary)] active:scale-[0.98]",
            loan.status === "completed" ? "flex-1" : "px-4"
          )}
        >
          View
        </button>
      </div>
    </div>
  );
}

function LoanRow({ loan }: { loan: Loan }) {
  const { navigate } = usePortal();
  const progressPct = Math.round(
    (loan.paymentsCompleted / loan.totalPayments) * 100
  );
  const daysUntil =
    loan.status !== "completed" ? getDaysUntil(loan.nextPaymentDate) : null;

  return (
    <div
      className={cn(
        "grid grid-cols-[1.2fr_0.9fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition-colors",
        loan.status === "overdue"
          ? "bg-red-50/40 hover:bg-red-50/60"
          : "hover:bg-[var(--surface-secondary)]/60"
      )}
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-display text-sm font-bold text-[var(--text-primary)]">
            {loan.loanId}
          </span>
          <LoanStatusBadge status={loan.status} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          {loan.loanPurpose} · {loan.tenure} months
        </p>
      </div>

      <div>
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Outstanding
        </p>
        <p className="font-display text-sm font-bold text-[var(--text-primary)]">
          {loan.status === "completed"
            ? "—"
            : formatCurrency(loan.outstandingBalance)}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Progress
          </span>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {loan.paymentsCompleted}/{loan.totalPayments}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div
            className={cn(
              "h-full rounded-full",
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

      <div className="text-sm">
        {loan.status === "completed" ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle size={14} weight="fill" />
            <span className="text-xs font-semibold">Fully paid</span>
          </span>
        ) : loan.status === "overdue" ? (
          <div>
            <p className="text-xs font-semibold text-red-600">
              {formatCurrency(loan.overdueAmount ?? 0)}
            </p>
            <p className="text-[11px] text-red-500">
              {loan.overdueDays} days overdue
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {loan.nextPaymentDate}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              {daysUntil !== null && daysUntil <= 5
                ? `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
                : formatCurrency(loan.nextPaymentAmount)}
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {loan.status !== "completed" && (
          <button
            onClick={() =>
              navigate({ type: "make-payment", loanId: loan.loanId })
            }
            className="rounded-xl bg-brand-blue px-3.5 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Pay
          </button>
        )}
        <button
          onClick={() => navigate({ type: "loan-detail", loanId: loan.loanId })}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-medium)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          aria-label={`View loan ${loan.loanId}`}
        >
          <CaretRight size={14} />
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

  const totalOutstanding = loans
    .filter((l) => l.status !== "completed")
    .reduce((sum, l) => sum + l.outstandingBalance, 0);

  const totalOverdue = overdueLoans.reduce(
    (sum, l) => sum + (l.overdueAmount ?? 0),
    0
  );

  return (
    <>
      {/* ─── Mobile view (unchanged) ─────────────────────────────── */}
      <div className="pb-28 lg:hidden">
        <div className="px-5 pt-6 pb-5 sm:px-6">
          <p className="mb-0.5 text-xs text-[var(--text-tertiary)]">{today}</p>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {user?.firstName}
          </h1>
        </div>

        <div className="space-y-6 px-5 sm:px-6">
          {nextPaymentLoan && (
            <div
              className={cn(
                "animate-fade-up rounded-2xl p-5",
                nextPaymentLoan.status === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-brand-blue text-white"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {nextPaymentLoan.status === "overdue" ? (
                      <Warning
                        size={17}
                        weight="fill"
                        className="shrink-0 text-red-200"
                      />
                    ) : (
                      <Bell
                        size={17}
                        weight="fill"
                        className="shrink-0 text-blue-200"
                      />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {nextPaymentLoan.status === "overdue"
                        ? "Payment Overdue"
                        : "Upcoming Payment"}
                    </span>
                  </div>
                  <p className="mb-1 font-display text-3xl font-bold">
                    {formatCurrency(
                      nextPaymentLoan.status === "overdue"
                        ? nextPaymentLoan.overdueAmount ?? 0
                        : nextPaymentLoan.nextPaymentAmount
                    )}
                  </p>
                  <p className="text-sm opacity-80">
                    {nextPaymentLoan.status === "overdue" ? (
                      <>
                        Loan{" "}
                        <span className="font-semibold">
                          {nextPaymentLoan.loanId}
                        </span>{" "}
                        · {nextPaymentLoan.overdueDays} days overdue
                      </>
                    ) : (
                      <>
                        Loan{" "}
                        <span className="font-semibold">
                          {nextPaymentLoan.loanId}
                        </span>{" "}
                        · Due {nextPaymentLoan.nextPaymentDate}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigate({
                      type: "make-payment",
                      loanId: nextPaymentLoan.loanId,
                    })
                  }
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
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

          <CFOneMarketingCard showToast={showToast} />

          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.10s" }}
          >
            <h2 className="mb-3 font-display text-base font-bold text-[var(--text-primary)]">
              My Loans
            </h2>
            <LoanTabBar
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            <div className="space-y-3">
              {tabLoans[activeTab].length === 0 ? (
                <EmptyLoanState tab={activeTab} />
              ) : (
                tabLoans[activeTab].map((loan) => (
                  <LoanCard key={loan.loanId} loan={loan} />
                ))
              )}
            </div>
          </div>

          {applications.length > 0 && (
            <div
              className="animate-fade-up"
              style={{ animationDelay: "0.15s" }}
            >
              <h2 className="mb-3 font-display text-base font-bold text-[var(--text-primary)]">
                Loan Applications
              </h2>
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.applicationId}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <FileText
                            size={15}
                            className="text-[var(--text-tertiary)]"
                          />
                          <span className="text-xs font-medium text-[var(--text-tertiary)]">
                            {app.applicationId}
                          </span>
                        </div>
                        <p className="font-display font-bold text-[var(--text-primary)]">
                          {formatCurrency(app.amount)}
                          <span className="ml-1 text-sm font-normal text-[var(--text-tertiary)]">
                            · {app.tenure} months
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          APPLICATION_STATUS_COLORS[app.status]
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[app.status]}
                      </span>
                    </div>

                    {app.remarks && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                        <Warning
                          size={14}
                          className="mt-0.5 shrink-0 text-amber-500"
                        />
                        <p className="text-xs text-amber-800">{app.remarks}</p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
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

          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.20s" }}
          >
            <h2 className="mb-3 font-display text-base font-bold text-[var(--text-primary)]">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: <CurrencyDollar size={20} />,
                  label: "Make a Payment",
                  sub: "PayNow or Cash",
                  action: () =>
                    loans.length > 0
                      ? navigate({
                          type: "make-payment",
                          loanId:
                            loans.find((l) => l.status !== "completed")
                              ?.loanId ?? loans[0].loanId,
                        })
                      : showToast("No active loans to pay"),
                },
                {
                  icon: <FileText size={20} />,
                  label: "View Contracts",
                  sub: "All loan documents",
                  action: () =>
                    loans.length > 0
                      ? navigate({
                          type: "loan-detail",
                          loanId: loans[0].loanId,
                        })
                      : showToast("No loans found"),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-left transition-all hover:border-[var(--border-medium)] hover:shadow-sm active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.label}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {item.sub}
                    </p>
                  </div>
                  <CaretRight
                    size={14}
                    className="mt-auto self-end text-[var(--text-tertiary)]"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop view ────────────────────────────────────────── */}
      <PageHeader
        eyebrow={today}
        title={`Welcome back, ${user?.firstName ?? "there"}.`}
        subtitle="Here's everything that needs your attention today."
        actions={
          <>
            <button
              onClick={() => showToast("Statement download coming soon.")}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Download size={16} />
              Statement
            </button>
            <button
              onClick={() => window.open("/", "_self")}
              className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Plus size={16} weight="bold" />
              Apply for new loan
            </button>
          </>
        }
      />

      <Workspace
        primary={
          <div className="space-y-8">
            <DesktopKpiStrip
              totalOutstanding={totalOutstanding}
              totalOverdue={totalOverdue}
              activeCount={activeLoans.length}
              nextPaymentLoan={nextPaymentLoan}
            />

            {nextPaymentLoan && nextPaymentLoan.status === "overdue" && (
              <DesktopOverdueBanner
                loan={nextPaymentLoan}
                onPay={() =>
                  navigate({
                    type: "make-payment",
                    loanId: nextPaymentLoan.loanId,
                  })
                }
              />
            )}

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                    My Loans
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
                    {loans.length} loan{loans.length !== 1 ? "s" : ""} on file
                  </p>
                </div>
                <LoanTabBar
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                  compact
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                {tabLoans[activeTab].length === 0 ? (
                  <div className="px-6 py-16">
                    <EmptyLoanState tab={activeTab} />
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    <div className="hidden grid-cols-[1.2fr_0.9fr_1fr_1fr_auto] gap-4 bg-[var(--surface-secondary)] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] lg:grid">
                      <span>Loan</span>
                      <span>Balance</span>
                      <span>Progress</span>
                      <span>
                        {activeTab === "overdue" ? "Overdue" : "Next payment"}
                      </span>
                      <span className="text-right">Actions</span>
                    </div>
                    {tabLoans[activeTab].map((loan) => (
                      <LoanRow key={loan.loanId} loan={loan} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {applications.length > 0 && (
              <section>
                <div className="mb-5">
                  <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                    Loan Applications
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
                    Submitted applications in review
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {applications.map((app) => (
                      <div
                        key={app.applicationId}
                        className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--surface-secondary)]/60"
                      >
                        <div>
                          <p className="mb-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                            {app.applicationId}
                          </p>
                          <p className="font-display text-sm font-bold text-[var(--text-primary)]">
                            {formatCurrency(app.amount)}
                            <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">
                              · {app.tenure} months
                            </span>
                          </p>
                        </div>
                        <div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              APPLICATION_STATUS_COLORS[app.status]
                            )}
                          >
                            {APPLICATION_STATUS_LABELS[app.status]}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          <p className="flex items-center gap-1">
                            <Clock size={12} />
                            Submitted {app.submittedDate}
                          </p>
                          <p className="mt-0.5">Updated {app.lastUpdated}</p>
                        </div>
                        <div className="text-right">
                          {app.remarks ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                              <Warning size={12} weight="fill" />
                              Action needed
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-tertiary)]">
                              Awaiting review
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        }
        rail={
          <>
            {nextPaymentLoan && (
              <RailPaymentCard
                loan={nextPaymentLoan}
                onPay={() =>
                  navigate({
                    type: "make-payment",
                    loanId: nextPaymentLoan.loanId,
                  })
                }
              />
            )}

            <CFOneMarketingCard showToast={showToast} compact />

            <RailQuickActions
              onPay={() =>
                loans.length > 0
                  ? navigate({
                      type: "make-payment",
                      loanId:
                        loans.find((l) => l.status !== "completed")?.loanId ??
                        loans[0].loanId,
                    })
                  : showToast("No active loans to pay")
              }
              onContracts={() =>
                loans.length > 0
                  ? navigate({ type: "loan-detail", loanId: loans[0].loanId })
                  : showToast("No loans found")
              }
              onStatement={() =>
                showToast("Statement download coming soon.")
              }
            />

            <RailSupportCard />
          </>
        }
      />
    </>
  );
}

// ─── Shared small pieces ────────────────────────────────────────────

function LoanTabBar({
  tabs,
  activeTab,
  onChange,
  compact,
}: {
  tabs: { key: LoanTab; label: string; count: number }[];
  activeTab: LoanTab;
  onChange: (tab: LoanTab) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-xl bg-[var(--surface-secondary)] p-1",
        compact ? "inline-flex" : "mb-4"
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200",
            compact ? "min-w-0" : "flex-1",
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
  );
}

function EmptyLoanState({ tab }: { tab: LoanTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckCircle size={40} className="mb-3 text-[var(--border-medium)]" />
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        {tab === "overdue" ? "No overdue payments" : `No ${tab} loans`}
      </p>
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
        {tab === "completed"
          ? "Your completed loans will appear here"
          : "Great job keeping up with your payments!"}
      </p>
    </div>
  );
}

function CFOneMarketingCard({
  showToast,
  compact,
}: {
  showToast: (msg: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up overflow-hidden rounded-2xl border border-brand-teal/30",
        !compact && "lg:mb-0"
      )}
      style={{ animationDelay: compact ? undefined : "0.05s" }}
    >
      <div
        className={cn("relative", compact ? "p-5" : "p-5")}
        style={{
          background:
            "linear-gradient(135deg, oklch(0.22 0.10 260) 0%, oklch(0.32 0.14 260) 50%, oklch(0.28 0.12 200) 100%)",
        }}
      >
        <div className="absolute right-3 top-3">
          <span className="rounded-full border border-brand-teal/30 bg-brand-teal/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand-teal">
            New
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-teal/30 bg-brand-teal/20">
            <Sparkle size={20} weight="fill" className="text-brand-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 font-display text-lg font-bold leading-tight text-white">
              CFOne Loan
            </p>
            <p className="mb-3 text-sm leading-relaxed text-white/70">
              Singapore&apos;s lowest interest rate from{" "}
              <span className="font-bold text-brand-teal">1% p.a.</span> —
              exclusively for existing customers.
            </p>
            <button
              onClick={() =>
                showToast(
                  "Redirecting to eligibility check — feature coming soon!"
                )
              }
              className="flex items-center gap-1.5 rounded-xl bg-brand-teal px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition-all hover:opacity-90 active:scale-[0.97]"
            >
              Check Eligibility
              <ArrowUpRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop-only components ────────────────────────────────────────

function DesktopKpiStrip({
  totalOutstanding,
  totalOverdue,
  activeCount,
  nextPaymentLoan,
}: {
  totalOutstanding: number;
  totalOverdue: number;
  activeCount: number;
  nextPaymentLoan: Loan | null;
}) {
  const kpis: { label: string; value: string; tone?: "danger" | "neutral" }[] =
    [
      {
        label: "Total outstanding",
        value: formatCurrency(totalOutstanding),
      },
      {
        label: "Active loans",
        value: `${activeCount}`,
      },
      {
        label:
          nextPaymentLoan?.status === "overdue"
            ? "Overdue now"
            : "Next payment",
        value:
          nextPaymentLoan === null
            ? "—"
            : nextPaymentLoan.status === "overdue"
            ? formatCurrency(totalOverdue)
            : formatCurrency(nextPaymentLoan.nextPaymentAmount),
        tone: nextPaymentLoan?.status === "overdue" ? "danger" : "neutral",
      },
    ];

  return (
    <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="px-6 py-5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {kpi.label}
          </p>
          <p
            className={cn(
              "font-display text-2xl font-bold leading-none",
              kpi.tone === "danger"
                ? "text-red-600"
                : "text-[var(--text-primary)]"
            )}
          >
            {kpi.value}
          </p>
          {kpi.label === "Next payment" && nextPaymentLoan && (
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
              {nextPaymentLoan.loanId} · {nextPaymentLoan.nextPaymentDate}
            </p>
          )}
          {kpi.label === "Overdue now" && nextPaymentLoan && (
            <p className="mt-1.5 text-xs text-red-500">
              {nextPaymentLoan.loanId} · {nextPaymentLoan.overdueDays} days
              overdue
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DesktopOverdueBanner({
  loan,
  onPay,
}: {
  loan: Loan;
  onPay: () => void;
}) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600">
        <Warning size={22} weight="fill" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-red-700">
          Payment overdue on loan {loan.loanId}
        </p>
        <p className="mt-0.5 text-xs text-red-600">
          {formatCurrency(loan.overdueAmount ?? 0)} unpaid for{" "}
          {loan.overdueDays} days. Settle now to avoid further late fees.
        </p>
      </div>
      <button
        onClick={onPay}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98]"
      >
        Pay now
        <ArrowRight size={14} weight="bold" />
      </button>
    </div>
  );
}

function RailPaymentCard({ loan, onPay }: { loan: Loan; onPay: () => void }) {
  const isOverdue = loan.status === "overdue";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl p-5",
        isOverdue ? "bg-red-600 text-white" : "bg-brand-blue text-white"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {isOverdue ? (
          <Warning size={15} weight="fill" className="text-red-200" />
        ) : (
          <Bell size={15} weight="fill" className="text-blue-200" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-85">
          {isOverdue ? "Payment overdue" : "Upcoming payment"}
        </span>
      </div>
      <p className="mb-1 font-display text-3xl font-bold leading-none">
        {formatCurrency(
          isOverdue
            ? loan.overdueAmount ?? 0
            : loan.nextPaymentAmount
        )}
      </p>
      <p className="text-xs opacity-80">
        Loan <span className="font-semibold">{loan.loanId}</span>
        {isOverdue
          ? ` · ${loan.overdueDays} days overdue`
          : ` · Due ${loan.nextPaymentDate}`}
      </p>
      <button
        onClick={onPay}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
          isOverdue
            ? "bg-white text-red-600 hover:bg-red-50"
            : "bg-white text-brand-blue hover:bg-blue-50"
        )}
      >
        Pay now
        <ArrowRight size={14} weight="bold" />
      </button>
    </div>
  );
}

function RailQuickActions({
  onPay,
  onContracts,
  onStatement,
}: {
  onPay: () => void;
  onContracts: () => void;
  onStatement: () => void;
}) {
  const actions = [
    {
      icon: <CurrencyDollar size={16} />,
      label: "Make a payment",
      sub: "PayNow or cash",
      onClick: onPay,
    },
    {
      icon: <FileText size={16} />,
      label: "View contracts",
      sub: "Loan agreements",
      onClick: onContracts,
    },
    {
      icon: <Download size={16} />,
      label: "Download statement",
      sub: "Last 12 months",
      onClick: onStatement,
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
      <p className="px-5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        Quick actions
      </p>
      <div className="divide-y divide-[var(--border-subtle)]">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-secondary)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              {action.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {action.label}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {action.sub}
              </p>
            </div>
            <CaretRight
              size={14}
              className="shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function RailSupportCard() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
          <Headset size={18} weight="fill" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Need help?
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Mon–Fri 10am–7pm · Sat 10am–3pm
          </p>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <a
          href="tel:+6567778080"
          className="block font-semibold text-brand-blue hover:underline"
        >
          +65 6777 8080
        </a>
        <a
          href="mailto:hellosg@crawfort.com"
          className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          hellosg@crawfort.com
        </a>
        <p className="pt-2 text-[var(--text-tertiary)]">
          10 Anson Road, #26-08 International Plaza, Singapore 079903
        </p>
      </div>
    </div>
  );
}
