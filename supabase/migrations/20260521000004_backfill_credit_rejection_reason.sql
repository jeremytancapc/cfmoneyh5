-- Backfill credit_rejection_reason for rows scored before the column existed.
-- Safe to re-run: only updates rows where credit_rejection_reason IS NULL.

UPDATE public.credit_assessments ca
SET credit_rejection_reason = CASE
  WHEN (ca.raw_assessment->>'meetsAgeRequirement')::boolean = false THEN 'under_18'
  WHEN (ca.raw_assessment->>'meetsForeignerIncomeFloor')::boolean = false THEN 'foreigner_income_floor'
  WHEN ca.max_eligible_loan <= 0 AND ca.existing_loans > 0 THEN 'zero_cap_moneylender_os'
  WHEN ca.max_eligible_loan <= 0 THEN 'zero_cap_income_too_low'
  ELSE 'zero_cap_income_too_low'
END
WHERE ca.is_eligible = false
  AND ca.credit_rejection_reason IS NULL
  AND ca.raw_assessment IS NOT NULL
  AND ca.raw_assessment <> '{}'::jsonb;

-- Approved rows must not carry a rejection code.
UPDATE public.credit_assessments
SET credit_rejection_reason = NULL
WHERE is_eligible = true
  AND credit_rejection_reason IS NOT NULL;
