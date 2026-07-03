-- Add eligibility check fields to leads table.
-- Populated by /api/apply/submit after calling AirConnect eligibility API.

alter table public.leads
  add column if not exists eligibility_status text,
  add column if not exists eligibility_notes text,
  add column if not exists eligibility_reloan_reason text;
