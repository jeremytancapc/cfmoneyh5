-- Migration: Create myinfo_profiles table
-- Stores the raw MyInfo webhook payload alongside mapped convenience columns.
-- One profile per lead (1-to-1 via lead_id unique constraint).

create table public.myinfo_profiles (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  lead_id               uuid not null references public.leads (id) on delete cascade,

  -- Convenience columns (mapped from raw_payload by buildMyInfoPatch)
  nric                  text,
  full_name             text,
  email                 text,
  mobile                text,
  address               text,
  postal_code           text,
  residential_status    text,     -- raw code, e.g. "C", "P"
  monthly_income_noa    numeric(12,2),  -- derived from NOA history

  -- Complete raw payload from the MyInfo webhook (for audit / future use)
  raw_payload           jsonb not null default '{}'::jsonb,

  constraint myinfo_profiles_lead_id_unique unique (lead_id)
);

create index myinfo_profiles_lead_id_idx on public.myinfo_profiles (lead_id);
create index myinfo_profiles_nric_idx    on public.myinfo_profiles (nric);

alter table public.myinfo_profiles enable row level security;

create policy "service role full access"
  on public.myinfo_profiles
  using (true)
  with check (true);
