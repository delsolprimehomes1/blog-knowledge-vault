-- Add 'replaced' status to external_citation_health allowed values
-- This allows tracking citations that have been replaced with better alternatives

-- Drop existing constraint
ALTER TABLE external_citation_health 
DROP CONSTRAINT IF EXISTS external_citation_health_status_check;

-- Add new constraint with 'replaced' status included
ALTER TABLE external_citation_health 
ADD CONSTRAINT external_citation_health_status_check 
CHECK (status = ANY (ARRAY['healthy'::text, 'broken'::text, 'redirected'::text, 'slow'::text, 'unreachable'::text, 'replaced'::text]));