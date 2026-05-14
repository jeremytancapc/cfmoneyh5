-- Migration: Remove the per-slot unique constraint on appointments.
-- Multiple customers can now book the same date/time slot without conflict.

drop index if exists public.appointments_slot_unique;
