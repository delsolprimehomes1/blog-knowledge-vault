-- Enable RLS on domain_usage_stats table
ALTER TABLE public.domain_usage_stats ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read domain stats
CREATE POLICY "Authenticated users can view domain stats"
ON public.domain_usage_stats
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert/update domain stats (via trigger)
CREATE POLICY "Service role can manage domain stats"
ON public.domain_usage_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Set search_path for the trigger function
ALTER FUNCTION public.update_domain_usage_stats() SET search_path TO 'public';