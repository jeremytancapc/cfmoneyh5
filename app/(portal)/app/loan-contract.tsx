"use client";

import { ArrowLeft, DownloadSimple, Seal, Warning } from "@phosphor-icons/react";
import { MOCK_LOANS, MOCK_USER, formatCurrency } from "./mock-data";
import { usePortal } from "./portal-context";

export function LoanContract() {
  const { view, goBack, showToast } = usePortal();
  if (view.type !== "loan-contract") return null;

  const loan = MOCK_LOANS.find((l) => l.loanId === view.loanId);
  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-5">
        <p className="text-[var(--text-secondary)]">Contract not found.</p>
        <button onClick={goBack} className="mt-4 text-sm text-brand-blue underline">Go back</button>
      </div>
    );
  }

  const contractDate = loan.startDate;
  const expiryDate = loan.endDate;
  const totalInterest = (loan.monthlyPayment * loan.totalPayments) - loan.principalAmount;
  const totalRepayable = loan.monthlyPayment * loan.totalPayments;

  return (
    <div className="pb-28 lg:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={() => showToast("PDF download feature coming soon.")}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:opacity-80 transition-opacity"
        >
          <DownloadSimple size={16} />
          Download PDF
        </button>
      </div>

      <div className="px-5 pt-6 sm:px-6 lg:px-8 max-w-[760px]">
        {/* Document header */}
        <div className="rounded-2xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] overflow-hidden mb-6">
          {/* Title bar */}
          <div className="bg-brand-blue px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
                  Loan Contract
                </p>
                <h1 className="font-display text-xl font-bold">
                  Personal Loan Agreement
                </h1>
                <p className="text-sm opacity-75 mt-1">Loan ID: {loan.loanId}</p>
              </div>
              <Seal size={36} weight="fill" className="text-brand-teal opacity-80 shrink-0" />
            </div>
          </div>

          {/* Contract meta */}
          <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)] sm:grid-cols-4">
            {[
              { label: "Contract Date", value: contractDate },
              { label: "Maturity Date", value: expiryDate },
              { label: "Licensed Under", value: "Moneylenders Act" },
              { label: "Status", value: loan.status.charAt(0).toUpperCase() + loan.status.slice(1) },
            ].map((item) => (
              <div key={item.label} className="bg-[var(--surface-elevated)] px-4 py-3">
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Parties */}
        <ContractSection title="1. Parties to This Agreement">
          <ContractClause>
            <p><span className="font-semibold">Lender:</span> CF Money Pte. Ltd. (UEN No. 201406595W), a licensed moneylender incorporated under the laws of Singapore, with its registered office at 10 Anson Road, #26-08 International Plaza, Singapore 079903 (&ldquo;the Lender&rdquo;).</p>
          </ContractClause>
          <ContractClause>
            <p><span className="font-semibold">Borrower:</span> {MOCK_USER.fullName}, NRIC {MOCK_USER.nricMasked}, contact number {MOCK_USER.mobile}, email {MOCK_USER.email} (&ldquo;the Borrower&rdquo;).</p>
          </ContractClause>
        </ContractSection>

        {/* Section: Loan Details */}
        <ContractSection title="2. Loan Details">
          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[
                  ["Loan Amount", formatCurrency(loan.principalAmount)],
                  ["Purpose of Loan", loan.loanPurpose],
                  ["Interest Rate", `${loan.interestRate}% per month (reducing balance)`],
                  ["Loan Tenure", `${loan.tenure} months`],
                  ["Monthly Repayment", formatCurrency(loan.monthlyPayment)],
                  ["Total Interest Payable", formatCurrency(totalInterest)],
                  ["Total Amount Repayable", formatCurrency(totalRepayable)],
                  ["Disbursement Date", contractDate],
                  ["Final Payment Date", expiryDate],
                  ["Late Payment Fee", "$60 per month of default"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] bg-[var(--surface-secondary)] font-medium w-1/2 text-xs">
                      {label}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-primary)] font-semibold text-xs">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContractSection>

        {/* Section: Repayment Schedule */}
        <ContractSection title="3. Repayment Schedule">
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            The Borrower shall repay the loan in {loan.totalPayments} equal monthly instalments of {formatCurrency(loan.monthlyPayment)} each, commencing from the disbursement date.
          </p>
          {loan.paymentSchedule.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-secondary)]">
                    <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">No.</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Due Date</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {loan.paymentSchedule.map((record, i) => (
                    <tr key={i} className={record.status === "paid" ? "bg-emerald-50/30" : record.status === "overdue" ? "bg-red-50/30" : ""}>
                      <td className="px-4 py-2.5 text-[var(--text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{record.date}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{formatCurrency(record.amount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={
                          record.status === "paid"
                            ? "text-emerald-600 font-semibold"
                            : record.status === "overdue"
                            ? "text-red-600 font-semibold"
                            : "text-[var(--text-tertiary)]"
                        }>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContractSection>

        {/* Section: Terms and Conditions */}
        <ContractSection title="4. Terms and Conditions">
          <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
            <ContractClause number="4.1">
              <span className="font-semibold text-[var(--text-primary)]">Disbursement.</span> The Lender shall disburse the loan amount to the Borrower upon execution of this Agreement and completion of all required documentation. Disbursement is subject to the Lender&apos;s satisfaction of the Borrower&apos;s eligibility and verification checks.
            </ContractClause>
            <ContractClause number="4.2">
              <span className="font-semibold text-[var(--text-primary)]">Repayment.</span> The Borrower shall make repayments on or before each due date specified in the repayment schedule. Payments may be made via PayNow, cash at our office, or such other methods as the Lender may prescribe from time to time.
            </ContractClause>
            <ContractClause number="4.3">
              <span className="font-semibold text-[var(--text-primary)]">Late Payment.</span> If the Borrower fails to repay any instalment by the due date, the Borrower shall pay a late fee of SGD 60 for each month or part thereof the instalment remains unpaid, as prescribed under the Moneylenders Rules 2009.
            </ContractClause>
            <ContractClause number="4.4">
              <span className="font-semibold text-[var(--text-primary)]">Early Repayment.</span> The Borrower may repay the outstanding loan amount in full at any time before the scheduled maturity date. An early repayment rebate shall be calculated on a pro-rata basis for unearned interest. No early repayment penalty applies.
            </ContractClause>
            <ContractClause number="4.5">
              <span className="font-semibold text-[var(--text-primary)]">Default.</span> The entire outstanding amount, including all accrued interest and fees, shall become immediately due and payable if the Borrower defaults on two or more consecutive instalments, becomes bankrupt, or is subject to any legal proceedings.
            </ContractClause>
            <ContractClause number="4.6">
              <span className="font-semibold text-[var(--text-primary)]">Data Protection.</span> The Lender collects and processes the Borrower&apos;s personal data in accordance with the Personal Data Protection Act 2012 (PDPA) and our Privacy Policy available at crawfort.com/sg/privacy/. The Borrower consents to the Lender sharing data with credit bureaus and relevant government agencies as required by law.
            </ContractClause>
            <ContractClause number="4.7">
              <span className="font-semibold text-[var(--text-primary)]">Governing Law.</span> This Agreement shall be governed by and construed in accordance with the laws of the Republic of Singapore. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of Singapore.
            </ContractClause>
            <ContractClause number="4.8">
              <span className="font-semibold text-[var(--text-primary)]">Entire Agreement.</span> This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, representations, and agreements.
            </ContractClause>
          </div>
        </ContractSection>

        {/* Important notice */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-6">
          <Warning size={18} weight="fill" className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Important Notice</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              This is a legally binding agreement. You are advised to read and understand all terms before signing. If you have any queries, please contact our customer service at <strong>+65 6777 8080</strong> or visit our office.
            </p>
          </div>
        </div>

        {/* Signature block */}
        <div className="rounded-2xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-5 mb-6">
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)] mb-4">5. Signatures</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[var(--text-secondary)]">
            <div>
              <p className="font-semibold text-[var(--text-primary)] mb-1">Borrower</p>
              <div className="h-12 border-b border-dashed border-[var(--border-medium)] mb-1" />
              <p>{MOCK_USER.fullName}</p>
              <p>NRIC: {MOCK_USER.nricMasked}</p>
              <p>Date: {contractDate}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] mb-1">Lender</p>
              <div className="h-12 border-b border-dashed border-[var(--border-medium)] mb-1" />
              <p>CF Money Pte. Ltd.</p>
              <p>Authorised Signatory</p>
              <p>Date: {contractDate}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => showToast("PDF download feature coming soon.")}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] py-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] active:scale-[0.98] transition-all mb-4"
        >
          <DownloadSimple size={18} />
          Download PDF Copy
        </button>
      </div>
    </div>
  );
}

function ContractSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-sm font-bold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-subtle)]">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ContractClause({ number, children }: { number?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm text-[var(--text-secondary)] leading-relaxed">
      {number && <span className="shrink-0 font-semibold text-[var(--text-tertiary)] text-xs mt-0.5">{number}</span>}
      <div>{children}</div>
    </div>
  );
}
