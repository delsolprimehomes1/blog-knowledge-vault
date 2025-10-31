-- Function to check and clean up stuck citation replacement jobs
CREATE OR REPLACE FUNCTION check_stuck_citation_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.citation_replacement_jobs
  SET 
    status = 'failed',
    error_message = 'Job timed out - no activity for 15+ minutes',
    completed_at = NOW()
  WHERE 
    status = 'running'
    AND updated_at < NOW() - INTERVAL '15 minutes';
END;
$$;