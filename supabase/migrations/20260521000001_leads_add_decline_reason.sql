-- Add decline_reason to leads so we can capture why applicants did not proceed
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decline_reason text;
