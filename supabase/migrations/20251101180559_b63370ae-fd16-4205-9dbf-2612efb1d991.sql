-- Add updated_at column to citation_replacement_jobs
ALTER TABLE citation_replacement_jobs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger function to auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_citation_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on citation_replacement_jobs
DROP TRIGGER IF EXISTS update_citation_replacement_jobs_timestamp ON citation_replacement_jobs;
CREATE TRIGGER update_citation_replacement_jobs_timestamp
BEFORE UPDATE ON citation_replacement_jobs
FOR EACH ROW
EXECUTE FUNCTION update_citation_job_timestamp();

-- Backfill existing jobs with their started_at or created_at timestamp
UPDATE citation_replacement_jobs
SET updated_at = COALESCE(started_at, created_at)
WHERE updated_at IS NULL;