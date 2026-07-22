-- Add 'axs' value to auth_method enum for AXS partner leads.
ALTER TYPE public.auth_method ADD VALUE IF NOT EXISTS 'axs';
