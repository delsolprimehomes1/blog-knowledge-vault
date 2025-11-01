-- Fix security warning: Add search_path to the trigger function
CREATE OR REPLACE FUNCTION update_citation_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';