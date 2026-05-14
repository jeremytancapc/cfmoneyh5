-- Migration: Add dedicated raw JSON columns for CPF and NOA to myinfo_profiles
-- These store the verbatim MyInfo webhook objects for audit and future reference.

alter table public.myinfo_profiles
  add column if not exists cpf_raw jsonb,
  add column if not exists noa_raw jsonb;

comment on column public.myinfo_profiles.cpf_raw is
  'Raw cpfcontributions object from the MyInfo webhook (verbatim, unprocessed)';

comment on column public.myinfo_profiles.noa_raw is
  'Raw noahistory object from the MyInfo webhook (verbatim, unprocessed)';
