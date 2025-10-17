-- Fix search path for check_stuck_cluster_jobs function
CREATE OR REPLACE FUNCTION public.check_stuck_cluster_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.cluster_generations
  SET 
    status = 'failed',
    error = 'Job timed out - no activity for 15+ minutes',
    updated_at = NOW()
  WHERE 
    status = 'generating'
    AND updated_at < NOW() - INTERVAL '15 minutes';
END;
$$;