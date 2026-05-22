-- Add in_progress to lead_status so partial leads (captured before final submit)
-- are distinguishable from fully-submitted ones ('new').
-- in_progress rows are created at the MyInfo activate step (Singpass) or at the
-- step-8 review confirm (manual), then updated to 'new' at final submit.

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'new';
