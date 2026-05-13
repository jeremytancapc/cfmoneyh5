-- Migration: Create credit_assessments table
-- One assessment per lead — stores the full scoring audit trail.

create type public.income_source as enum ('cpf', 'noa', 'self_declared');

create table public.credit_assessments (
  id                          uuid primary key default gen_random_uuid(),
  created_at                  timestamptz not null default now(),

  lead_id                     uuid not null references public.leads (id) on delete cascade,

  -- Final result
  income_source               public.income_source not null,
  verified_monthly_income     numeric(12,2) not null,
  approved_loan_amount        numeric(10,2) not null,
  max_eligible_loan           numeric(10,2) not null,
  is_eligible                 boolean not null,

  -- Applicant context at time of scoring
  age_at_application          smallint,
  existing_loans              numeric(10,2) not null default 0,

  -- Human-readable explanation
  explanation                 text,

  -- Full audit payload (JSON from assessCredit result)
  raw_assessment              jsonb not null default '{}'::jsonb,

  constraint credit_assessments_lead_id_unique unique (lead_id)
);

create index credit_assessments_lead_id_idx on public.credit_assessments (lead_id);

alter table public.credit_assessments enable row level security;

create policy "service role full access"
  on public.credit_assessments
  using (true)
  with check (true);

create policy "anon can insert credit assessments"
  on public.credit_assessments
  for insert
  to anon
  with check (true);
