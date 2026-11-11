-- AXS worklist: a view the Google Sheet syncs from (docs/axs-worklist-sheet.md).
--
-- The sheet lives in Google, outside our systems, so it gets no personal data:
-- no name, email, phone, NRIC, income or loan amount. Only our CFAXS reference,
-- the AXS reference and where the application stands. Staff look the customer
-- up in AirConnect by the reference.
--
-- The view is in a `reporting` schema that Supabase's API does not expose, and
-- the sheet logs in as `axs_worklist_reader`, which can read this view and
-- nothing else. So the password kept in Apps Script cannot reach customer data.
-- The view runs with its owner's rights, which is what lets that role read it
-- without any grant on the tables behind it.
--
-- The role is created without a password: set one by hand after applying,
--   alter role axs_worklist_reader with password '<from the password manager>';
-- and never commit it.
--
-- Additive only. Apply to staging first, then production.

create schema if not exists reporting;

create or replace view reporting.axs_worklist as
select
  to_char(l.created_at at time zone 'Asia/Singapore', 'YYYY-MM-DD HH24:MI') as submitted_sgt,
  -- Same as axsApplicationRef() in lib/lead-id.ts.
  'CFAXS-' || upper(right(replace(l.id::text, '-', ''), 8))                  as cfaxs_ref,
  coalesce(l.axs_ref, '')                                                   as axs_ref,
  case l.id_type
    when 'singaporean' then 'SG'
    when 'pr' then 'PR'
    when 'foreigner' then 'Foreigner'
    else ''
  end                                                                       as residency,
  case ca.income_source::text when 'cpf' then 'CPF' when 'noa' then 'NOA' else 'None' end as income_found,
  pg.page,
  case
    when l.eligibility_status = 'RELOAN' then 'Existing customer'
    when l.eligibility_status = 'NOT_ELIGIBLE' then 'Not eligible'
    when ca.credit_rejection_reason = 'under_18' then 'Under 18'
    else ''
  end                                                                       as rejected_because,
  case
    when pg.page = 'Rejected' then 'Rejected'
    when pg.page = 'Pending' then 'Pending review'
    when a.id is null then 'Not booked yet'
    when a.status = 'completed' then 'Done'
    when a.status = 'missed' then 'Missed'
    when a.status = 'cancelled' then 'Cancelled'
    when a.airconnect_appointment_id is not null then 'Booked – agent confirmed'
    else 'Booked – waiting for agent'
  end                                                                       as stage,
  coalesce(to_char(a.appointment_date, 'YYYY-MM-DD') || ' ' || left(a.appointment_time::text, 5), '') as appointment_sgt,
  coalesce(a.status::text, '')                                              as appointment_status,
  coalesce(a.airconnect_appointment_id::text, '')                           as airconnect_appt,
  coalesce(a.axs_notified_status, '')                                       as last_told_axs,
  coalesce(to_char(a.axs_notified_at at time zone 'Asia/Singapore', 'YYYY-MM-DD HH24:MI'), '') as axs_told_at,
  l.created_at,
  a.appointment_date
from public.leads l
left join public.credit_assessments ca on ca.lead_id = l.id
left join lateral (
  select x.*
  from public.appointments x
  where x.lead_id = l.id
  order by x.created_at desc
  limit 1
) a on true
-- The page the AXS link opened, worked out again from what was saved
-- (partnerPage() in lib/axs-response.ts). credit_assessments.income_source is
-- cpf when any CPF was found and noa when only an NOA was.
cross join lateral (
  select case
    when l.eligibility_status in ('RELOAN', 'NOT_ELIGIBLE') or ca.credit_rejection_reason = 'under_18' then 'Rejected'
    when l.id_type = 'foreigner' or coalesce(ca.income_source::text, '') not in ('cpf', 'noa') then 'Pending'
    else 'Book'
  end as page
) pg
where l.auth_method = 'axs';

comment on view reporting.axs_worklist is
  'AXS applications for the Google Sheet worklist. No personal data: references and statuses only.';

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'axs_worklist_reader') then
    create role axs_worklist_reader login;
  end if;
end
$$;

revoke all on schema public from axs_worklist_reader;
grant usage on schema reporting to axs_worklist_reader;
grant select on reporting.axs_worklist to axs_worklist_reader;

-- Belt and braces: the API roles never see this schema, even if it is later
-- added to the exposed schemas by mistake.
revoke all on schema reporting from anon, authenticated;
revoke all on all tables in schema reporting from anon, authenticated;
