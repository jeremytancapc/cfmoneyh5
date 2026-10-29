-- AXS appointment status sync.
--
-- Once an AXS customer has booked, agents take over in AirConnect, which now
-- tells us when the appointment is created, moved, cancelled, missed or done
-- (POST /api/airconnect/appointment-event). We mirror that onto our own
-- appointment row and pass it on to AXS, so the AXS app can show the customer
-- where they stand and offer the booking link again after a cancel or a miss.
--
-- Additive only. Apply to staging first, then production.

-- A no-show. Like cancelled, it releases the one-booking-per-application lock
-- so the customer's link books again.
alter type public.appointment_status add value if not exists 'missed';

alter table public.appointments
  -- AirConnect's id for the appointment this row now mirrors. Null until an
  -- agent creates one there; changes when they reschedule (a new row there).
  add column if not exists airconnect_appointment_id integer,
  -- What AXS was last told, so a repeated event sends nothing. booked |
  -- rescheduled | cancelled | missed. Null for rows that are not AXS bookings.
  add column if not exists axs_notified_status text,
  add column if not exists axs_notified_at timestamptz;

comment on column public.appointments.airconnect_appointment_id is
  'AirConnect appointment id this row mirrors (from appointment events). Null until an agent creates one.';
comment on column public.appointments.axs_notified_status is
  'Last status sent to the AXS booking webhook (booked/rescheduled/cancelled/missed). Null for non-AXS rows.';

-- Earlier AXS bookings whose "booked" webhook AXS accepted (api_logs has the
-- successful call) are marked as told. Ones whose webhook was never sent or
-- failed stay null, so the first AirConnect event for them still tells AXS.
update public.appointments a
set axs_notified_status = 'booked',
    axs_notified_at = (
      select max(g.created_at)
      from public.api_logs g
      where g.lead_id = a.lead_id
        and g.tag = '[axs/book:webhook]'
        and g.response_ok
        and g.created_at >= a.created_at
    )
from public.leads l
where l.id = a.lead_id
  and l.auth_method = 'axs'
  and a.axs_notified_status is null
  and exists (
    select 1
    from public.api_logs g
    where g.lead_id = a.lead_id
      and g.tag = '[axs/book:webhook]'
      and g.response_ok
      and g.created_at >= a.created_at
  );

-- The booking link handed to AXS at submit, so later status updates send the
-- customer the exact link they already have. Null for leads from before this
-- column, which fall back to minting one from the lead.
alter table public.leads
  add column if not exists axs_booking_token text;

comment on column public.leads.axs_booking_token is
  'Signed AXS booking token returned to AXS at submit. Null for non-AXS leads and AXS leads from before 2026-10.';
