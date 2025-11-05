-- Phase 3A: Add detailed violation tracking to hygiene reports
ALTER TABLE citation_hygiene_reports
ADD COLUMN IF NOT EXISTS detailed_violations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN citation_hygiene_reports.detailed_violations IS 'Detailed breakdown of violations per article and domain with replacement status';

-- Add index for querying detailed violations
CREATE INDEX IF NOT EXISTS idx_citation_hygiene_reports_detailed_violations 
ON citation_hygiene_reports USING GIN (detailed_violations);