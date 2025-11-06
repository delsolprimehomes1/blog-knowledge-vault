-- Add blocked_competitor_count to citation replacement tracking tables
ALTER TABLE citation_replacement_jobs
ADD COLUMN IF NOT EXISTS blocked_competitor_count integer DEFAULT 0;

ALTER TABLE citation_replacement_chunks
ADD COLUMN IF NOT EXISTS blocked_competitor_count integer DEFAULT 0;

-- Add comment explaining the field
COMMENT ON COLUMN citation_replacement_jobs.blocked_competitor_count IS 'Citations from competitor domains with no valid non-competitor alternatives';
COMMENT ON COLUMN citation_replacement_chunks.blocked_competitor_count IS 'Citations from competitor domains with no valid non-competitor alternatives';