-- Fix security warnings for Phase 19 helper functions by setting search_path

-- Function to check if extension exists (with secure search_path)
CREATE OR REPLACE FUNCTION check_extension_exists(extension_name TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = extension_name
  );
END;
$$;

-- Function to get table columns (with secure search_path)
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = get_table_columns.table_name
    AND c.table_schema = 'public';
END;
$$;

-- Function to get database triggers (with secure search_path)
CREATE OR REPLACE FUNCTION get_database_triggers()
RETURNS TABLE (
  trigger_name TEXT,
  event_object_table TEXT,
  action_statement TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.trigger_name::TEXT,
    t.event_object_table::TEXT,
    t.action_statement::TEXT
  FROM information_schema.triggers t
  WHERE t.trigger_schema = 'public';
END;
$$;