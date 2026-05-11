"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle,
  ArrowRight,
  CurrencyDollar,
  ChartBar,
  Info,
} from "@phosphor-icons/react";
import type { LoanFormData } from "@/lib/loan-form";
import { calculateMonthlyRepayment, formatCurrency } from "@/lib/loan-form";

interface Props {
  formData: LoanFormData;
}

const SOURCE_LABELS: Record<string, string> = {
  cpf: "CPF contributions",
  noa: "Notice of Assessment (NOA)",
  self_declared: "Self-declared income",
};

export function ApprovalView({ formData }: Props) {
  const router = useRouter();

  const {
    approvedLoanAmount,
    verifiedMonthlyIncome,
    incomeSource,
    amount: requestedAmount,
    tenure,
    fullName,
  } = formData;

  const monthlyRepayment = calculateMonthlyRepayment(approvedLoanAmount, tenure);
  const annualIncome = verifiedMonthlyIncome * 12;
  const sourceLabelText = SOURCE_LABELS[incomeSource] ?? "Declared income";

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      {/* Sidebar */}
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10">
          <div className="mb-16">
            <Image src="/images/cf-money-white.png" alt="CF Money" width={160} height={48} className="h-6 w-auto" priority />
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-[var(--text-on-brand)] max-w-[420px]">
            You&apos;re pre-approved!
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--text-on-brand)] opacity-75 max-w-[380px]">
            This is an in-principle approval based on your verified income. Final approval is subject to our assessment at your appointment.
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col flex-1 overflow-x-clip">
        <div className="flex items-center px-6 pb-4 pt-8 lg:hidden">
          <a href="/">
            <Image src="/images/cf-money-full-color.png" alt="CF Money" width={120} height={36} className="h-4 w-auto" priority />
          </a>
        </div>

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px] flex flex-col gap-8 animate-fade-up">

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <CheckCircle size={20} weight="duotone" className="text-brand-teal shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                In-Principle Approval
              </span>
            </div>

            {/* Heading */}
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {fullName ? `Hi ${fullName.split(" ")[0]},` : "Great news!"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                Here&apos;s your in-principle loan offer based on your verified income.
              </p>
            </div>

            <>
              {/* Approved amount card */}
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-teal/10">
                      <CurrencyDollar size={18} weight="duotone" className="text-brand-teal" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">Approved loan amount</p>
                  </div>
                  <div className="px-5 py-5">
                    <p className="font-display text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                      {formatCurrency(approvedLoanAmount)}
                    </p>
                    {approvedLoanAmount < requestedAmount && (
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        You requested {formatCurrency(requestedAmount)} — approved amount is based on your eligible limit.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 border-t border-[var(--border-subtle)]">
                    <div className="px-5 py-4 border-r border-[var(--border-subtle)]">
                      <p className="text-xs text-[var(--text-tertiary)]">Monthly repayment</p>
                      <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                        {formatCurrency(monthlyRepayment)}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">over {tenure} months</p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs text-[var(--text-tertiary)]">Tenure</p>
                      <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">{tenure} months</p>
                    </div>
                  </div>
                </div>

                {/* Income verification card */}
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-blue/8">
                      <ChartBar size={18} weight="duotone" className="text-brand-blue" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">Income verification</p>
                  </div>
                  <div className="px-5 py-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Verified monthly income</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(Math.round(verifiedMonthlyIncome))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Annual income</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(Math.round(annualIncome))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Source used</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{sourceLabelText}</span>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3">
                  <Info size={15} weight="duotone" className="mt-0.5 shrink-0 text-[var(--text-tertiary)]" />
                  <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
                    This is an in-principle approval only. Final loan amount and terms are subject to verification at your appointment with our loan officer.
                  </p>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => router.push("/apply/book")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand-teal text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                >
                  Book your appointment
                  <ArrowRight size={16} weight="bold" />
                </button>
            </>
          </div>
        </div>
      </main>
    </div>
  );
}
