export interface CpfContribution {
  month: string;   // "YYYY-MM"
  amount: number;
}

export interface NoaRecord {
  yearOfAssessment: string;   // "YYYY"
  employmentIncome: number;   // annual SGD
}

export interface LoanFormData {
  amount: number;
  tenure: number;
  urgency: string;
  authMethod: "" | "singpass" | "manual";
  idType: string;
  fullName: string;
  nric: string;
  employmentStatus: string;
  monthlyIncome: string;
  mobile: string;
  loanPurpose: string;
  postalCode: string;
  address: string;
  workIndustry: string;
  position: string;
  employmentDuration: string;
  officePhone: string;
  mailingAddress: string;
  secondaryMobile: string;
  bankruptcyDeclaration: "" | "clear" | "discharged_lt5" | "active";
  maritalStatus: string;
  email: string;
  moneylenderLoanAmount: string;
  moneylenderNoLoans: boolean;
  moneylenderPaymentHistory: string;

  // MyInfo-derived data for credit scoring (populated at SingPass callback)
  dob: string;                              // "YYYY-MM-DD"
  cpfContributions: CpfContribution[];      // up to 12 months
  noaHistory: NoaRecord[];                  // all available YA records

  // Populated by /api/apply/submit — carried in session to approval + booking pages
  leadId: string;
  approvedLoanAmount: number;
  verifiedMonthlyIncome: number;
  incomeSource: "" | "cpf" | "noa" | "self_declared";
}

export const initialLoanFormData: LoanFormData = {
  amount: 5000,
  tenure: 6,
  urgency: "",
  authMethod: "",
  idType: "",
  fullName: "",
  nric: "",
  employmentStatus: "",
  monthlyIncome: "",
  mobile: "",
  loanPurpose: "",
  postalCode: "",
  address: "",
  workIndustry: "",
  position: "",
  employmentDuration: "",
  officePhone: "",
  mailingAddress: "",
  secondaryMobile: "",
  bankruptcyDeclaration: "",
  maritalStatus: "Single",
  email: "",
  moneylenderLoanAmount: "",
  moneylenderNoLoans: false,
  moneylenderPaymentHistory: "",
  dob: "",
  cpfContributions: [],
  noaHistory: [],
  leadId: "",
  approvedLoanAmount: 0,
  verifiedMonthlyIncome: 0,
  incomeSource: "",
};

export function calculateMonthlyRepayment(amount: number, months: number): number {
  const monthlyRate = 0.47 / 12;
  if (months === 0) return 0;
  return (
    (amount * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
