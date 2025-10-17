-- Add timeout detection columns to cluster_generations table
ALTER TABLE cluster_generations 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE cluster_generations 
ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMP WITH TIME ZONE;

-- Create function to check for stuck jobs
CREATE OR REPLACE FUNCTION check_stuck_cluster_jobs()
RETURNS void AS $$
BEGIN
  UPDATE cluster_generations
  SET 
    status = 'failed',
    error = 'Job timed out - no activity for 15+ minutes',
    updated_at = NOW()
  WHERE 
    status = 'generating'
    AND updated_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the columns
COMMENT ON COLUMN cluster_generations.started_at IS 'Timestamp when job actually started processing (not just created)';
COMMENT ON COLUMN cluster_generations.timeout_at IS 'Calculated timeout threshold: started_at + 15 minutes';