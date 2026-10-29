-- AXS worklist view, corrected after the first sync on staging.
--
-- 1. "Income found" and "Page" now read CPF/NOA from the MyInfo payload, the
--    way the submit route decides the page. The credit assessment's
--    income_source said "self_declared" when CPF months were too old to score,
--    which showed customers who got the booking link as "Pending".
-- 2. "Stage" puts a booking first. Applications from before the page rule
--    (28 Oct 2026) all got the booking link, so one that booked showed as
--    "Pending review" when the rule now says pending.
--
-- Same columns in the same order, so the sheet script needs no change. The
-- view still outputs no personal data: the MyInfo payload is only tested for
-- whether CPF or NOA is present.

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
  case
    when mi.has_cpf and mi.has_noa then 'CPF + NOA'
    when mi.has_cpf then 'CPF'
    when mi.has_noa then 'NOA'
    else 'None'
  end                                                                       as income_found,
  pg.page,
  case
    when l.eligibility_status = 'RELOAN' then 'Existing customer'
    when l.eligibility_status = 'NOT_ELIGIBLE' then 'Not eligible'
    when ca.credit_rejection_reason = 'under_18' then 'Under 18'
    else ''
  end                                                                       as rejected_because,
  -- A booking outranks the page: applications from before the page rule
  -- (28 Oct 2026) were all given the booking link, whatever the rule says now.
  case
    when pg.page = 'Rejected' then 'Rejected'
    when a.status = 'completed' then 'Done'
    when a.status = 'missed' then 'Missed'
    when a.status = 'cancelled' then 'Cancelled'
    when a.airconnect_appointment_id is not null then 'Booked – agent confirmed'
    when a.id is not null then 'Booked – waiting for agent'
    when pg.page = 'Pending' then 'Pending review'
    else 'Not booked yet'
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
-- CPF or NOA present in MyInfo, as the submit route tests it (hasCpfOrNoa in
-- app/api/axs/submit/route.ts). The credit assessment's income_source is not
-- the same thing: CPF months too old to score fall back to self_declared.
left join lateral (
  select
    -- Guarded so one malformed payload can't fail the whole sync.
    case when jsonb_typeof(m.raw_payload -> 'cpfcontributions' -> 'history') = 'array'
      then jsonb_array_length(m.raw_payload -> 'cpfcontributions' -> 'history') > 0
      else false end as has_cpf,
    case when (m.raw_payload -> 'noa-basic' -> 'amount' ->> 'value') ~ '^-?[0-9]+(\.[0-9]+)?$'
      then (m.raw_payload -> 'noa-basic' -> 'amount' ->> 'value')::numeric <> 0
      else false end as has_noa
  from public.myinfo_profiles m
  where m.lead_id = l.id
  order by m.created_at desc
  limit 1
) mi on true
left join lateral (
  select x.*
  from public.appointments x
  where x.lead_id = l.id
  order by x.created_at desc
  limit 1
) a on true
-- The page the AXS link opened, worked out again from what was saved
-- (partnerPage() in lib/axs-response.ts).
cross join lateral (
  select case
    when l.eligibility_status in ('RELOAN', 'NOT_ELIGIBLE') or ca.credit_rejection_reason = 'under_18' then 'Rejected'
    when l.id_type = 'foreigner' or not (coalesce(mi.has_cpf, false) or coalesce(mi.has_noa, false)) then 'Pending'
    else 'Book'
  end as page
) pg
where l.auth_method = 'axs';

