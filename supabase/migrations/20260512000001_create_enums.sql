-- Migration: Create shared enum types
-- Run order: 1 (enums must exist before tables)

create type public.lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'appointed',
  'approved',
  'rejected',
  'withdrawn'
);

create type public.auth_method as enum (
  'manual',
  'singpass'
);

create type public.id_type as enum (
  'singaporean',
  'pr',
  'foreigner'
);

create type public.bankruptcy_declaration as enum (
  'clear',
  'discharged_lt5',
  'active'
);

create type public.appointment_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed'
);
