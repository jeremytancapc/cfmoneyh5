/**
 * Hand-maintained types that mirror the Supabase schema.
 * Keep in sync with supabase/migrations/*.sql.
 *
 * To regenerate automatically once Supabase CLI is set up:
 *   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 */

export type IncomeSource = "cpf" | "noa" | "self_declared";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "appointed"
  | "approved"
  | "rejected"
  | "withdrawn";

export type AuthMethod = "manual" | "singpass";
export type IdType = "singaporean" | "pr" | "foreigner";
export type BankruptcyDeclaration = "clear" | "discharged_lt5" | "active";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";

// ─── leads ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;

  // Loan request
  loan_amount: number;
  loan_tenure: number;
  loan_purpose: string | null;
  urgency: string | null;

  // Identity
  auth_method: AuthMethod | null;
  id_type: IdType | null;
  full_name: string | null;
  nric: string | null;

  // Contact
  email: string | null;
  mobile: string | null;
  secondary_mobile: string | null;

  // Address
  postal_code: string | null;
  address: string | null;
  mailing_address: string | null;

  // Employment
  employment_status: string | null;
  monthly_income: string | null;
  work_industry: string | null;
  position: string | null;
  employment_duration: string | null;
  office_phone: string | null;

  // Declarations
  marital_status: string | null;
  bankruptcy_declaration: BankruptcyDeclaration | null;
  moneylender_no_loans: boolean;
  moneylender_loan_amount: string | null;
  moneylender_payment_history: string | null;

  // CRM
  status: LeadStatus;
  notes: string | null;
  assigned_to: string | null;
}

export type LeadInsert = Omit<Lead, "id" | "created_at" | "updated_at" | "status"> & {
  status?: LeadStatus;
};
export type LeadUpdate = Partial<LeadInsert>;

// ─── myinfo_profiles ──────────────────────────────────────────────────────────

export interface MyInfoProfile {
  id: string;
  created_at: string;
  lead_id: string;

  // Mapped fields (convenience columns)
  nric: string | null;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  residential_status: string | null;
  monthly_income_noa: number | null;

  // Separate raw columns from the MyInfo webhook
  cpf_raw: Record<string, unknown> | null;
  noa_raw: Record<string, unknown> | null;
  myinfo_raw: Record<string, unknown> | null;  // complete verbatim myinfo object

  // Processed convenience payload (mapped CPF/NOA arrays + dob)
  raw_payload: Record<string, unknown>;
}

export type MyInfoProfileInsert = Omit<MyInfoProfile, "id" | "created_at">;

// ─── appointments ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;

  appointment_date: string;   // YYYY-MM-DD
  appointment_time: string;   // HH:MM (24h)

  status: AppointmentStatus;
  notes: string | null;
  reminder_sent_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export type AppointmentInsert = Omit<Appointment, "id" | "created_at" | "updated_at">;
export type AppointmentUpdate = Partial<AppointmentInsert>;

// ─── credit_assessments ───────────────────────────────────────────────────────

export interface CreditAssessmentRow {
  id: string;
  created_at: string;
  lead_id: string;

  income_source: IncomeSource;
  verified_monthly_income: number;
  approved_loan_amount: number;
  max_eligible_loan: number;
  is_eligible: boolean;

  age_at_application: number | null;
  existing_loans: number;
  moneylender_loan_amount: number | null;
  moneylender_payment_history: string | null;
  explanation: string | null;
  raw_assessment: Record<string, unknown>;
}

export type CreditAssessmentInsert = Omit<CreditAssessmentRow, "id" | "created_at">;

// ─── Database shape for createClient<Database>() ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: LeadUpdate;
        Relationships: [];
      };
      myinfo_profiles: {
        Row: MyInfoProfile;
        Insert: MyInfoProfileInsert;
        Update: Partial<MyInfoProfileInsert>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: AppointmentInsert;
        Update: AppointmentUpdate;
        Relationships: [];
      };
      credit_assessments: {
        Row: CreditAssessmentRow;
        Insert: CreditAssessmentInsert;
        Update: Partial<CreditAssessmentInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      lead_status: LeadStatus;
      auth_method: AuthMethod;
      id_type: IdType;
      bankruptcy_declaration: BankruptcyDeclaration;
      appointment_status: AppointmentStatus;
      income_source: IncomeSource;
    };
  };
}
