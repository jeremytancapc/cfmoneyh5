export interface PortalUser {
  fullName: string;
  firstName: string;
  nricMasked: string;
  mobile: string;
  email: string;
  memberSince: string;
}

export interface PaymentRecord {
  date: string;
  amount: number;
  status: "paid" | "upcoming" | "overdue";
  reference?: string;
}

export interface Loan {
  loanId: string;
  status: "active" | "overdue" | "completed";
  principalAmount: number;
  outstandingBalance: number;
  monthlyPayment: number;
  interestRate: number;
  tenure: number;
  startDate: string;
  endDate: string;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  fullSettlementAmount: number;
  paymentsCompleted: number;
  totalPayments: number;
  overdueAmount?: number;
  overdueDays?: number;
  loanPurpose: string;
  paymentSchedule: PaymentRecord[];
}

export interface LoanApplication {
  applicationId: string;
  status: "pending_review" | "documents_required" | "approved" | "rejected";
  amount: number;
  tenure: number;
  submittedDate: string;
  lastUpdated: string;
  remarks?: string;
}

export const MOCK_USER: PortalUser = {
  fullName: "Tan Wei Liang",
  firstName: "Wei Liang",
  nricMasked: "S••••345D",
  mobile: "+65 9123 4567",
  email: "weiliangtan@email.com",
  memberSince: "March 2022",
};

export const MOCK_LOANS: Loan[] = [
  {
    loanId: "379GKMAK",
    status: "active",
    principalAmount: 5000,
    outstandingBalance: 3312.80,
    monthlyPayment: 331.31,
    interestRate: 4,
    tenure: 18,
    startDate: "15 Oct 2023",
    endDate: "15 Apr 2025",
    nextPaymentDate: "15 May 2026",
    nextPaymentAmount: 331.31,
    fullSettlementAmount: 3381.42,
    paymentsCompleted: 10,
    totalPayments: 18,
    overdueAmount: undefined,
    overdueDays: undefined,
    loanPurpose: "Personal",
    paymentSchedule: [
      { date: "15 Jun 2025", amount: 331.31, status: "paid", reference: "PAY-001" },
      { date: "15 Jul 2025", amount: 331.31, status: "paid", reference: "PAY-002" },
      { date: "15 Aug 2025", amount: 331.31, status: "paid", reference: "PAY-003" },
      { date: "15 Sep 2025", amount: 331.31, status: "paid", reference: "PAY-004" },
      { date: "15 Oct 2025", amount: 331.31, status: "paid", reference: "PAY-005" },
      { date: "15 Nov 2025", amount: 331.31, status: "paid", reference: "PAY-006" },
      { date: "15 Dec 2025", amount: 331.31, status: "paid", reference: "PAY-007" },
      { date: "15 Jan 2026", amount: 331.31, status: "paid", reference: "PAY-008" },
      { date: "15 Feb 2026", amount: 331.31, status: "paid", reference: "PAY-009" },
      { date: "15 Mar 2026", amount: 331.31, status: "paid", reference: "PAY-010" },
      { date: "15 Apr 2026", amount: 331.31, status: "paid", reference: "PAY-011" },
      { date: "15 May 2026", amount: 331.31, status: "upcoming" },
      { date: "15 Jun 2026", amount: 331.31, status: "upcoming" },
      { date: "15 Jul 2026", amount: 331.31, status: "upcoming" },
      { date: "15 Aug 2026", amount: 331.31, status: "upcoming" },
      { date: "15 Sep 2026", amount: 331.31, status: "upcoming" },
      { date: "15 Oct 2026", amount: 331.31, status: "upcoming" },
      { date: "15 Nov 2026", amount: 331.31, status: "upcoming" },
    ],
  },
  {
    loanId: "8008636E",
    status: "active",
    principalAmount: 3000,
    outstandingBalance: 1800.00,
    monthlyPayment: 200.00,
    interestRate: 4,
    tenure: 18,
    startDate: "20 Jan 2025",
    endDate: "20 Jul 2026",
    nextPaymentDate: "20 May 2026",
    nextPaymentAmount: 200.00,
    fullSettlementAmount: 1836.00,
    paymentsCompleted: 9,
    totalPayments: 18,
    loanPurpose: "Business",
    paymentSchedule: [
      { date: "20 Jan 2025", amount: 200.00, status: "paid", reference: "PAY-B001" },
      { date: "20 Feb 2025", amount: 200.00, status: "paid", reference: "PAY-B002" },
      { date: "20 Mar 2025", amount: 200.00, status: "paid", reference: "PAY-B003" },
      { date: "20 Apr 2025", amount: 200.00, status: "paid", reference: "PAY-B004" },
      { date: "20 May 2025", amount: 200.00, status: "paid", reference: "PAY-B005" },
      { date: "20 Jun 2025", amount: 200.00, status: "paid", reference: "PAY-B006" },
      { date: "20 Jul 2025", amount: 200.00, status: "paid", reference: "PAY-B007" },
      { date: "20 Aug 2025", amount: 200.00, status: "paid", reference: "PAY-B008" },
      { date: "20 Sep 2025", amount: 200.00, status: "paid", reference: "PAY-B009" },
      { date: "20 May 2026", amount: 200.00, status: "upcoming" },
      { date: "20 Jun 2026", amount: 200.00, status: "upcoming" },
      { date: "20 Jul 2026", amount: 200.00, status: "upcoming" },
    ],
  },
  {
    loanId: "4KX29WQR",
    status: "overdue",
    principalAmount: 2000,
    outstandingBalance: 650.00,
    monthlyPayment: 216.67,
    interestRate: 4,
    tenure: 12,
    startDate: "10 Jun 2025",
    endDate: "10 Jun 2026",
    nextPaymentDate: "10 Apr 2026",
    nextPaymentAmount: 650.00,
    fullSettlementAmount: 668.00,
    paymentsCompleted: 9,
    totalPayments: 12,
    overdueAmount: 650.00,
    overdueDays: 35,
    loanPurpose: "Medical",
    paymentSchedule: [
      { date: "10 Jun 2025", amount: 216.67, status: "paid", reference: "PAY-C001" },
      { date: "10 Jul 2025", amount: 216.67, status: "paid", reference: "PAY-C002" },
      { date: "10 Aug 2025", amount: 216.67, status: "paid", reference: "PAY-C003" },
      { date: "10 Sep 2025", amount: 216.67, status: "paid", reference: "PAY-C004" },
      { date: "10 Oct 2025", amount: 216.67, status: "paid", reference: "PAY-C005" },
      { date: "10 Nov 2025", amount: 216.67, status: "paid", reference: "PAY-C006" },
      { date: "10 Dec 2025", amount: 216.67, status: "paid", reference: "PAY-C007" },
      { date: "10 Jan 2026", amount: 216.67, status: "paid", reference: "PAY-C008" },
      { date: "10 Feb 2026", amount: 216.67, status: "paid", reference: "PAY-C009" },
      { date: "10 Mar 2026", amount: 216.67, status: "overdue" },
      { date: "10 Apr 2026", amount: 216.67, status: "overdue" },
      { date: "10 May 2026", amount: 216.67, status: "overdue" },
    ],
  },
  {
    loanId: "CMP7731X",
    status: "completed",
    principalAmount: 1500,
    outstandingBalance: 0,
    monthlyPayment: 166.67,
    interestRate: 4,
    tenure: 12,
    startDate: "5 Mar 2023",
    endDate: "5 Mar 2024",
    nextPaymentDate: "—",
    nextPaymentAmount: 0,
    fullSettlementAmount: 0,
    paymentsCompleted: 12,
    totalPayments: 12,
    loanPurpose: "Education",
    paymentSchedule: [],
  },
  {
    loanId: "CMP5509B",
    status: "completed",
    principalAmount: 800,
    outstandingBalance: 0,
    monthlyPayment: 88.89,
    interestRate: 4,
    tenure: 10,
    startDate: "12 Jan 2022",
    endDate: "12 Nov 2022",
    nextPaymentDate: "—",
    nextPaymentAmount: 0,
    fullSettlementAmount: 0,
    paymentsCompleted: 10,
    totalPayments: 10,
    loanPurpose: "Personal",
    paymentSchedule: [],
  },
];

export const MOCK_APPLICATIONS: LoanApplication[] = [
  {
    applicationId: "APP-20260410-001",
    status: "documents_required",
    amount: 8000,
    tenure: 24,
    submittedDate: "10 Apr 2026",
    lastUpdated: "12 Apr 2026",
    remarks: "Please submit your latest 3 months payslip and CPF contribution statement.",
  },
  {
    applicationId: "APP-20260401-002",
    status: "pending_review",
    amount: 3500,
    tenure: 12,
    submittedDate: "1 Apr 2026",
    lastUpdated: "3 Apr 2026",
    remarks: undefined,
  },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const parts = dateStr.split(" ");
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const target = new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getNextPaymentLoan(loans: Loan[]): Loan | null {
  const activeLoans = loans.filter((l) => l.status === "active" || l.status === "overdue");
  if (activeLoans.length === 0) return null;
  const overdue = activeLoans.find((l) => l.status === "overdue");
  if (overdue) return overdue;
  return activeLoans.reduce((soonest, loan) => {
    const soonestDays = getDaysUntil(soonest.nextPaymentDate);
    const loanDays = getDaysUntil(loan.nextPaymentDate);
    return loanDays < soonestDays ? loan : soonest;
  });
}

export const APPLICATION_STATUS_LABELS: Record<LoanApplication["status"], string> = {
  pending_review: "Under Review",
  documents_required: "Documents Required",
  approved: "Approved",
  rejected: "Rejected",
};

export const APPLICATION_STATUS_COLORS: Record<LoanApplication["status"], string> = {
  pending_review: "text-amber-700 bg-amber-50 border-amber-200",
  documents_required: "text-orange-700 bg-orange-50 border-orange-200",
  approved: "text-emerald-700 bg-emerald-50 border-emerald-200",
  rejected: "text-red-700 bg-red-50 border-red-200",
};
