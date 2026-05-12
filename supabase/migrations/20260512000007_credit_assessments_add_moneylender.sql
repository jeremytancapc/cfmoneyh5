-- Migration: Add moneylender fields to credit_assessments
-- Stores the declared outstanding balance and payment history for full audit visibility.

alter table public.credit_assessments
  add column if not exists moneylender_loan_amount  numeric(10,2),
  add column if not exists moneylender_payment_history text;

comment on column public.credit_assessments.moneylender_loan_amount is
  'Declared outstanding moneylender balance at time of scoring (audit only — not deducted from cap).';
comment on column public.credit_assessments.moneylender_payment_history is
  'Payment history selected by applicant: on_time | average | bad_debt (null = no loans declared).';
