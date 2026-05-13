"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { LoanFormData } from "@/lib/loan-form";
import { calculateMonthlyRepayment } from "@/lib/loan-form";
import { LoanResults } from "@/app/loan-results";

interface Props {
  formData: LoanFormData;
}

export function ApprovalView({ formData }: Props) {
  const router = useRouter();

  const { approvedLoanAmount, tenure, incomeSource } = formData;

  // Show the approved amount (not the requested amount) in the results screen.
  const displayData = { ...formData, amount: approvedLoanAmount };
  const monthlyRepayment = calculateMonthlyRepayment(approvedLoanAmount, tenure);

  const incomeNote =
    incomeSource === "cpf"
      ? "Income verified via CPF contributions."
      : incomeSource === "noa"
        ? "Income verified via Notice of Assessment (NOA)."
        : "Income based on self-declaration.";

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh">
      {/* Sidebar */}
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-blue p-12 xl:p-16">
        <div className="relative z-10">
          <div className="mb-16">
            <Image
              src="/images/cf-money-white.png"
              alt="CF Money"
              width={160}
              height={48}
              className="h-6 w-auto"
              priority
            />
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
            <Image
              src="/images/cf-money-full-color.png"
              alt="CF Money"
              width={120}
              height={36}
              className="h-4 w-auto"
              priority
            />
          </a>
        </div>

        <div className="flex flex-col items-center justify-start px-5 pb-8 pt-6 sm:px-8 flex-1 lg:justify-center lg:px-12 lg:pt-10 lg:pb-10 xl:px-20">
          <div className="w-full max-w-[520px]">
            <LoanResults
              formData={displayData}
              monthlyRepayment={monthlyRepayment}
              onAccept={() => router.push("/apply/book")}
              reminderItems={[incomeNote]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
