-- Migration: Create appointments table
-- One appointment per lead (a lead can rebook if the previous one is cancelled).

create table public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  lead_id               uuid not null references public.leads (id) on delete cascade,

  appointment_date      date not null,           -- YYYY-MM-DD
  appointment_time      time not null,           -- HH:MM (24h, stored as TIME)

  status                public.appointment_status not null default 'pending',
  notes                 text,
  reminder_sent_at      timestamptz,
  cancelled_at          timestamptz,
  cancellation_reason   text
);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create index appointments_lead_id_idx       on public.appointments (lead_id);
create index appointments_date_time_idx     on public.appointments (appointment_date, appointment_time);
create index appointments_status_idx        on public.appointments (status);

-- Prevent double-booking the same slot
create unique index appointments_slot_unique
  on public.appointments (appointment_date, appointment_time)
  where status not in ('cancelled');

alter table public.appointments enable row level security;

create policy "service role full access"
  on public.appointments
  using (true)
  with check (true);
