-- System credit rejection reason (distinct from leads.decline_reason = offer survey).
ALTER TABLE public.credit_assessments
  ADD COLUMN IF NOT EXISTS credit_rejection_reason text;

COMMENT ON COLUMN public.credit_assessments.credit_rejection_reason IS
  'System decline code when is_eligible=false: under_18, foreigner_income_floor, zero_cap_moneylender_os, zero_cap_income_too_low. NULL when approved.';

COMMENT ON COLUMN public.leads.decline_reason IS
  'Customer survey reason when declining an approved offer (e.g. Shopping around). NOT a credit engine rejection.';
