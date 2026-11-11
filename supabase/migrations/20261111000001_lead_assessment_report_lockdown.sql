-- Lock the Looker-only reporting view away from the publishable API.
--
-- lead_assessment_report selects full_name, mobile, and nric from leads for
-- ops reporting. Looker Studio connects with a dedicated Postgres role, not
-- with the publishable `anon` or `authenticated` keys, so those two roles
-- must not be able to SELECT from the view.
--
-- security_invoker = true is defence in depth: a view without it runs with
-- the owner's privileges, so even RLS on the underlying tables is bypassed
-- for anyone the view is granted to. With security_invoker on, a later grant
-- that re-exposes the view still has to clear the caller's RLS on leads,
-- credit_assessments, and appointments.

REVOKE SELECT ON public.lead_assessment_report FROM anon, authenticated;

ALTER VIEW public.lead_assessment_report SET (security_invoker = true);
