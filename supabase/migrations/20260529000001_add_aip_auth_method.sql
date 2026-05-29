-- Migration: Add 'aip' value to auth_method enum for pre-approved appointment flow
-- AIP leads skip Singpass and manual review — they book directly from a pre-approved mobile number.

ALTER TYPE public.auth_method ADD VALUE IF NOT EXISTS 'aip';
