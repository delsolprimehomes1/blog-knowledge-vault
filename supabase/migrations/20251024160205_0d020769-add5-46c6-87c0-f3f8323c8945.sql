-- Add 'replaced' status to external_citation_health
ALTER TABLE external_citation_health 
ALTER COLUMN status TYPE text;

COMMENT ON COLUMN external_citation_health.status IS 
  'Citation health status: healthy, broken, redirected, slow, unreachable, replaced, pending';

-- Add 'failed' and 'invalid' status to dead_link_replacements
ALTER TABLE dead_link_replacements 
ALTER COLUMN status TYPE text;

COMMENT ON COLUMN dead_link_replacements.status IS 
  'Replacement status: pending, suggested, approved, rejected, applied, rolled_back, invalid, failed';