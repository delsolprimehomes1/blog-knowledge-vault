-- Fix search_path for trigger function to address security warning
CREATE OR REPLACE FUNCTION public.update_translation_status_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;