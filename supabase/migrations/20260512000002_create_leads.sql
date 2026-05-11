-- Migration: Create leads table
-- Stores one row per loan application lead submitted through the apply flow.

create table public.leads (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  -- Loan request
  loan_amount               numeric(10,2) not null,
  loan_tenure               smallint not null,
  loan_purpose              text,
  urgency                   text,

  -- Identity
  auth_method               public.auth_method,
  id_type                   public.id_type,
  full_name                 text,
  nric                      text,

  -- Contact
  email                     text,
  mobile                    text,
  secondary_mobile          text,

  -- Address
  postal_code               text,
  address                   text,
  mailing_address           text,

  -- Employment
  employment_status         text,
  monthly_income            text,
  work_industry             text,
  position                  text,
  employment_duration       text,
  office_phone              text,

  -- Declarations
  marital_status            text,
  bankruptcy_declaration    public.bankruptcy_declaration,
  moneylender_no_loans      boolean not null default false,
  moneylender_loan_amount   text,
  moneylender_payment_history text,

  -- CRM fields
  status                    public.lead_status not null default 'new',
  notes                     text,
  assigned_to               text
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Useful lookup indexes
create index leads_status_idx       on public.leads (status);
create index leads_nric_idx         on public.leads (nric);
create index leads_email_idx        on public.leads (email);
create index leads_created_at_idx   on public.leads (created_at desc);

-- Row-Level Security: deny all by default, allow service-role via admin client
alter table public.leads enable row level security;

-- Policy: allow the service-role (admin client) full access
create policy "service role full access"
  on public.leads
  using (true)
  with check (true);
