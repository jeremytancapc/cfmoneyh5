-- Migration: Add myinfo_raw column to myinfo_profiles
-- Stores the complete myinfo object from the webhook verbatim for full audit trail.

alter table public.myinfo_profiles
  add column if not exists myinfo_raw jsonb;

comment on column public.myinfo_profiles.myinfo_raw is
  'Complete verbatim myinfo object received from the MyInfo webhook (full audit copy)';
