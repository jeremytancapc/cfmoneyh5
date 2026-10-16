-- Store the AXS partner's own reference on the lead.
--
-- Until now it only survived inside the signed booking token and buried in
-- myinfo_profiles.raw_payload, so it could not be queried or joined on, and
-- answering "what happened to AXS25072100001?" meant scanning a JSON blob
-- that also holds NRIC, name and address.
--
-- Nullable: only AXS leads carry one, and existing rows predate the column.

alter table public.leads
  add column if not exists axs_ref text;

comment on column public.leads.axs_ref is
  'AXS partner reference, from myinfo.axs."reference-id". Null for non-AXS leads.';

-- Partial: the vast majority of leads are not AXS, so index only the ones that are.
create index if not exists leads_axs_ref_idx
  on public.leads (axs_ref)
  where axs_ref is not null;
