-- Create table for citation replacement chunks
CREATE TABLE citation_replacement_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_job_id UUID REFERENCES citation_replacement_jobs(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  citations JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER NOT NULL,
  auto_applied_count INTEGER DEFAULT 0,
  manual_review_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chunks_parent_job ON citation_replacement_chunks(parent_job_id);
CREATE INDEX idx_chunks_status ON citation_replacement_chunks(status);
CREATE INDEX idx_chunks_parent_status ON citation_replacement_chunks(parent_job_id, status);

-- Add RLS policies
ALTER TABLE citation_replacement_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chunks"
ON citation_replacement_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM citation_replacement_jobs
    WHERE citation_replacement_jobs.id = citation_replacement_chunks.parent_job_id
    AND citation_replacement_jobs.created_by = auth.uid()
  )
);

CREATE POLICY "Service role can insert chunks"
ON citation_replacement_chunks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update chunks"
ON citation_replacement_chunks FOR UPDATE
USING (true);

-- Add chunk tracking columns to parent job table
ALTER TABLE citation_replacement_jobs
ADD COLUMN total_chunks INTEGER DEFAULT 0,
ADD COLUMN completed_chunks INTEGER DEFAULT 0,
ADD COLUMN failed_chunks INTEGER DEFAULT 0,
ADD COLUMN chunk_size INTEGER DEFAULT 25;

-- Update stuck job detection to handle chunks
CREATE OR REPLACE FUNCTION check_stuck_citation_jobs()
RETURNS void AS $$
BEGIN
  -- Mark stuck chunks as failed
  UPDATE citation_replacement_chunks
  SET 
    status = 'failed',
    error_message = 'Chunk timed out - no activity for 15+ minutes',
    updated_at = NOW()
  WHERE 
    status = 'processing'
    AND updated_at < NOW() - INTERVAL '15 minutes';

  -- Update parent job failed_chunks count
  WITH failed_counts AS (
    SELECT parent_job_id, COUNT(*) as failed
    FROM citation_replacement_chunks
    WHERE status = 'failed'
    GROUP BY parent_job_id
  ),
  completed_counts AS (
    SELECT parent_job_id, COUNT(*) as completed
    FROM citation_replacement_chunks
    WHERE status = 'completed'
    GROUP BY parent_job_id
  )
  UPDATE citation_replacement_jobs j
  SET 
    failed_chunks = COALESCE(fc.failed, 0),
    completed_chunks = COALESCE(cc.completed, 0),
    updated_at = NOW()
  FROM failed_counts fc
  FULL OUTER JOIN completed_counts cc ON fc.parent_job_id = cc.parent_job_id
  WHERE j.id = COALESCE(fc.parent_job_id, cc.parent_job_id);

  -- Mark parent job as failed if all chunks failed
  UPDATE citation_replacement_jobs
  SET 
    status = 'failed',
    error_message = 'All chunks failed or timed out',
    completed_at = NOW()
  WHERE 
    status = 'running'
    AND total_chunks > 0
    AND failed_chunks = total_chunks;
    
  -- Mark parent job as completed if all chunks are done (completed or failed)
  UPDATE citation_replacement_jobs
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE 
    status = 'running'
    AND total_chunks > 0
    AND (completed_chunks + failed_chunks) >= total_chunks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Add trigger to update chunk timestamps
CREATE TRIGGER update_chunks_updated_at
BEFORE UPDATE ON citation_replacement_chunks
FOR EACH ROW
EXECUTE FUNCTION update_citation_job_timestamp();