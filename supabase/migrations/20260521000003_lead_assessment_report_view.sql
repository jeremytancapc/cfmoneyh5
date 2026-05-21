-- Looker Studio / reporting view — separates credit rejection vs offer decline.
CREATE OR REPLACE VIEW public.lead_assessment_report AS
SELECT
  (l.created_at AT TIME ZONE 'Asia/Singapore')::timestamp AS created_at_sgt,
  l.full_name,
  l.mobile,
  l.nric,
  'CFH5-' || upper(right(replace(l.id::text, '-', ''), 8)) AS ref,

  CASE WHEN ca.is_eligible THEN 'Approved' ELSE 'Credit declined' END AS outcome,

  CASE ca.income_source::text
    WHEN 'cpf' THEN 'CPF'
    WHEN 'noa' THEN 'NOA'
    WHEN 'self_declared' THEN 'Self-declared'
  END AS income_derived_from,

  ca.credit_rejection_reason,
  CASE ca.credit_rejection_reason
    WHEN 'under_18' THEN 'Under 18'
    WHEN 'foreigner_income_floor' THEN 'Foreigner income below minimum'
    WHEN 'zero_cap_moneylender_os' THEN 'Cap zero — moneylender O/S'
    WHEN 'zero_cap_income_too_low' THEN 'Cap zero — income too low'
    ELSE NULL
  END AS credit_rejection_label,

  l.decline_reason AS offer_decline_reason,

  l.loan_amount AS requested_amount,
  ca.approved_loan_amount,
  ca.max_eligible_loan,
  ca.verified_monthly_income,
  ca.existing_loans AS moneylender_os,
  l.auth_method::text AS auth_method,
  l.id_type::text AS id_type,
  ca.is_eligible,
  app.appointment_date,
  TO_CHAR(app.appointment_time, 'HH24:MI') AS appt_time_sgt,
  (app.appointment_date IS NOT NULL) AS has_booking,
  ca.explanation

FROM public.leads l
JOIN public.credit_assessments ca ON l.id = ca.lead_id
LEFT JOIN LATERAL (
  SELECT a.appointment_date, a.appointment_time
  FROM public.appointments a
  WHERE a.lead_id = l.id
  ORDER BY a.created_at DESC
  LIMIT 1
) app ON true;

COMMENT ON VIEW public.lead_assessment_report IS
  'Reporting: credit_rejection_* = system decline; offer_decline_reason = customer survey on approved offer.';
