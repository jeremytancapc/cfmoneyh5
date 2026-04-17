"use client";

import {
  ArrowLeft,
  DownloadSimple,
  Seal,
  Warning,
  CheckCircle,
  FileText,
} from "@phosphor-icons/react";
import { MOCK_LOANS, MOCK_USER, formatCurrency } from "./mock-data";
import { usePortal } from "./portal-context";
import { PageHeader, Workspace } from "./portal-layout";

export function LoanContract() {
  const { view, goBack, navigate, showToast } = usePortal();
  if (view.type !== "loan-contract") return null;

  const loan = MOCK_LOANS.find((l) => l.loanId === view.loanId);
  if (!loan) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
        <p className="text-[var(--text-secondary)]">Contract not found.</p>
        <button onClick={goBack} className="mt-4 text-sm text-brand-blue underline">
          Go back
        </button>
      </div>
    );
  }

  const contractDate = loan.startDate;
  const expiryDate = loan.endDate;
  const totalInterest =
    loan.monthlyPayment * loan.totalPayments - loan.principalAmount;
  const totalRepayable = loan.monthlyPayment * loan.totalPayments;

  const DocumentHeader = (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border-medium)] bg-[var(--surface-elevated)]">
      <div className="bg-brand-blue px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest opacity-70">
              Loan Contract
            </p>
            <h1 className="font-display text-xl font-bold">
              Personal Loan Agreement
            </h1>
            <p className="mt-1 text-sm opacity-75">Loan ID: {loan.loanId}</p>
          </div>
          <Seal
            size={36}
            weight="fill"
            className="shrink-0 text-brand-teal opacity-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)] sm:grid-cols-4">
        {[
          { label: "Contract Date", value: contractDate },
          { label: "Maturity Date", value: expiryDate },
          { label: "Licensed Under", value: "Moneylenders Act" },
          {
            label: "Status",
            value: loan.status.charAt(0).toUpperCase() + loan.status.slice(1),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[var(--surface-elevated)] px-4 py-3"
          >
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const DocumentBody = (
    <>
      <ContractSection title="1. Parties to This Agreement">
        <ContractClause>
          <p>
            <span className="font-semibold">Lender:</span> CF Money Pte. Ltd.
            (UEN No. 201406595W), a licensed moneylender incorporated under the
            laws of Singapore, with its registered office at 10 Anson Road,
            #26-08 International Plaza, Singapore 079903 (&ldquo;the
            Lender&rdquo;).
          </p>
        </ContractClause>
        <ContractClause>
          <p>
            <span className="font-semibold">Borrower:</span> {MOCK_USER.fullName},
            NRIC {MOCK_USER.nricMasked}, contact number {MOCK_USER.mobile},
            email {MOCK_USER.email} (&ldquo;the Borrower&rdquo;).
          </p>
        </ContractClause>
      </ContractSection>

      <ContractSection title="2. Loan Details">
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {[
                ["Loan Amount", formatCurrency(loan.principalAmount)],
                ["Purpose of Loan", loan.loanPurpose],
                [
                  "Interest Rate",
                  `${loan.interestRate}% per month (reducing balance)`,
                ],
                ["Loan Tenure", `${loan.tenure} months`],
                ["Monthly Repayment", formatCurrency(loan.monthlyPayment)],
                ["Total Interest Payable", formatCurrency(totalInterest)],
                ["Total Amount Repayable", formatCurrency(totalRepayable)],
                ["Disbursement Date", contractDate],
                ["Final Payment Date", expiryDate],
                ["Late Payment Fee", "$60 per month of default"],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="w-1/2 bg-[var(--surface-secondary)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)]">
                    {label}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)]">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContractSection>

      <ContractSection title="3. Repayment Schedule">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          The Borrower shall repay the loan in {loan.totalPayments} equal monthly
          instalments of {formatCurrency(loan.monthlyPayment)} each, commencing
          from the disbursement date.
        </p>
        {loan.paymentSchedule.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--surface-secondary)]">
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    No.
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Due Date
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {loan.paymentSchedule.map((record, i) => (
                  <tr
                    key={i}
                    className={
                      record.status === "paid"
                        ? "bg-emerald-50/30"
                        : record.status === "overdue"
                        ? "bg-red-50/30"
                        : ""
                    }
                  >
                    <td className="px-4 py-2.5 text-[var(--text-tertiary)]">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                      {record.date}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          record.status === "paid"
                            ? "font-semibold text-emerald-600"
                            : record.status === "overdue"
                            ? "font-semibold text-red-600"
                            : "text-[var(--text-tertiary)]"
                        }
                      >
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContractSection>

      <ContractSection title="4. Terms and Conditions">
        <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          <ContractClause number="4.1">
            <span className="font-semibold text-[var(--text-primary)]">
              Disbursement.
            </span>{" "}
            The Lender shall disburse the loan amount to the Borrower upon
            execution of this Agreement and completion of all required
            documentation. Disbursement is subject to the Lender&apos;s
            satisfaction of the Borrower&apos;s eligibility and verification
            checks.
          </ContractClause>
          <ContractClause number="4.2">
            <span className="font-semibold text-[var(--text-primary)]">
              Repayment.
            </span>{" "}
            The Borrower shall make repayments on or before each due date
            specified in the repayment schedule. Payments may be made via
            PayNow, cash at our office, or such other methods as the Lender may
            prescribe from time to time.
          </ContractClause>
          <ContractClause number="4.3">
            <span className="font-semibold text-[var(--text-primary)]">
              Late Payment.
            </span>{" "}
            If the Borrower fails to repay any instalment by the due date, the
            Borrower shall pay a late fee of SGD 60 for each month or part
            thereof the instalment remains unpaid, as prescribed under the
            Moneylenders Rules 2009.
          </ContractClause>
          <ContractClause number="4.4">
            <span className="font-semibold text-[var(--text-primary)]">
              Early Repayment.
            </span>{" "}
            The Borrower may repay the outstanding loan amount in full at any
            time before the scheduled maturity date. An early repayment rebate
            shall be calculated on a pro-rata basis for unearned interest. No
            early repayment penalty applies.
          </ContractClause>
          <ContractClause number="4.5">
            <span className="font-semibold text-[var(--text-primary)]">
              Default.
            </span>{" "}
            The entire outstanding amount, including all accrued interest and
            fees, shall become immediately due and payable if the Borrower
            defaults on two or more consecutive instalments, becomes bankrupt,
            or is subject to any legal proceedings.
          </ContractClause>
          <ContractClause number="4.6">
            <span className="font-semibold text-[var(--text-primary)]">
              Data Protection.
            </span>{" "}
            The Lender collects and processes the Borrower&apos;s personal data
            in accordance with the Personal Data Protection Act 2012 (PDPA) and
            our Privacy Policy available at crawfort.com/sg/privacy/. The
            Borrower consents to the Lender sharing data with credit bureaus and
            relevant government agencies as required by law.
          </ContractClause>
          <ContractClause number="4.7">
            <span className="font-semibold text-[var(--text-primary)]">
              Governing Law.
            </span>{" "}
            This Agreement shall be governed by and construed in accordance with
            the laws of the Republic of Singapore. Any dispute arising out of or
            in connection with this Agreement shall be subject to the exclusive
            jurisdiction of the courts of Singapore.
          </ContractClause>
          <ContractClause number="4.8">
            <span className="font-semibold text-[var(--text-primary)]">
              Entire Agreement.
            </span>{" "}
            This Agreement constitutes the entire agreement between the parties
            with respect to the subject matter hereof and supersedes all prior
            discussions, representations, and agreements.
          </ContractClause>
        </div>
      </ContractSection>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Warning
          size={18}
          weight="fill"
          className="mt-0.5 shrink-0 text-amber-500"
        />
        <div>
          <p className="mb-1 text-sm font-semibold text-amber-800">
            Important Notice
          </p>
          <p className="text-xs leading-relaxed text-amber-700">
            This is a legally binding agreement. You are advised to read and
            understand all terms before signing. If you have any queries, please
            contact our customer service at <strong>+65 6777 8080</strong> or
            visit our office.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-[var(--text-primary)]">
          5. Signatures
        </h3>
        <div className="grid grid-cols-1 gap-6 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-[var(--text-primary)]">
              Borrower
            </p>
            <div className="mb-1 h-12 border-b border-dashed border-[var(--border-medium)]" />
            <p>{MOCK_USER.fullName}</p>
            <p>NRIC: {MOCK_USER.nricMasked}</p>
            <p>Date: {contractDate}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-[var(--text-primary)]">
              Lender
            </p>
            <div className="mb-1 h-12 border-b border-dashed border-[var(--border-medium)]" />
            <p>CF Money Pte. Ltd.</p>
            <p>Authorised Signatory</p>
            <p>Date: {contractDate}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ─── Mobile view (unchanged) ─────────────────────────────── */}
      <div className="pb-28 lg:hidden">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-4 sm:px-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={() => showToast("PDF download feature coming soon.")}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue transition-opacity hover:opacity-80"
          >
            <DownloadSimple size={16} />
            Download PDF
          </button>
        </div>

        <div className="max-w-[760px] px-5 pt-6 sm:px-6">
          {DocumentHeader}
          {DocumentBody}

          <button
            onClick={() => showToast("PDF download feature coming soon.")}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] py-4 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-secondary)] active:scale-[0.98]"
          >
            <DownloadSimple size={18} />
            Download PDF Copy
          </button>
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
          { label: "Contract" },
        ]}
        eyebrow="Legal document"
        title="Personal Loan Agreement"
        subtitle={`Contract ${loan.loanId} · Signed ${contractDate}`}
        actions={
          <>
            <button
              onClick={goBack}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={() => showToast("PDF download feature coming soon.")}
              className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <DownloadSimple size={14} weight="bold" />
              Download PDF
            </button>
          </>
        }
      />

      <Workspace
        primary={
          <div className="max-w-[800px]">
            {DocumentHeader}
            {DocumentBody}
          </div>
        }
        rail={
          <ContractSidebar
            loan={loan}
            totalInterest={totalInterest}
            totalRepayable={totalRepayable}
            onDownload={() => showToast("PDF download feature coming soon.")}
            onBackToLoan={() =>
              navigate({ type: "loan-detail", loanId: loan.loanId })
            }
          />
        }
      />
    </>
  );
}

function ContractSidebar({
  loan,
  totalInterest,
  totalRepayable,
  onDownload,
  onBackToLoan,
}: {
  loan: NonNullable<ReturnType<typeof MOCK_LOANS.find>>;
  totalInterest: number;
  totalRepayable: number;
  onDownload: () => void;
  onBackToLoan: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            At a glance
          </p>
          <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(loan.principalAmount)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Principal borrowed
          </p>
        </div>
        <div className="divide-y divide-[var(--border-subtle)] text-sm">
          <MetaRow label="Interest rate" value={`${loan.interestRate}% p.m.`} />
          <MetaRow label="Tenure" value={`${loan.tenure} months`} />
          <MetaRow
            label="Monthly repayment"
            value={formatCurrency(loan.monthlyPayment)}
          />
          <MetaRow
            label="Total interest"
            value={formatCurrency(totalInterest)}
          />
          <MetaRow
            label="Total repayable"
            value={formatCurrency(totalRepayable)}
          />
          <MetaRow label="Start" value={loan.startDate} />
          <MetaRow label="Maturity" value={loan.endDate} />
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onDownload}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <DownloadSimple size={16} weight="bold" />
          Download PDF
        </button>
        <button
          onClick={onBackToLoan}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]"
        >
          <FileText size={16} />
          Back to loan
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          Regulator
        </p>
        <div className="flex items-start gap-2">
          <CheckCircle
            size={16}
            weight="fill"
            className="mt-0.5 shrink-0 text-emerald-500"
          />
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Licensed under the Moneylenders Act 2008 by the Registry of
            Moneylenders, Ministry of Law. UEN{" "}
            <span className="font-mono">201406595W</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span className="text-xs font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function ContractSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 border-b border-[var(--border-subtle)] pb-2 font-display text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ContractClause({
  number,
  children,
}: {
  number?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 text-sm leading-relaxed text-[var(--text-secondary)]">
      {number && (
        <span className="mt-0.5 shrink-0 text-xs font-semibold text-[var(--text-tertiary)]">
          {number}
        </span>
      )}
      <div>{children}</div>
    </div>
  );
}
