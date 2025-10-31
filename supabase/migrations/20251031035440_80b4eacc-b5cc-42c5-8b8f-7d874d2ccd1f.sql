-- Create citation_replacement_jobs table for tracking batch operations
CREATE TABLE IF NOT EXISTS public.citation_replacement_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  articles_processed INTEGER DEFAULT 0,
  auto_applied_count INTEGER DEFAULT 0,
  manual_review_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.citation_replacement_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create jobs
CREATE POLICY "Users can create citation replacement jobs"
  ON public.citation_replacement_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Allow users to view their own jobs
CREATE POLICY "Users can view their own citation replacement jobs"
  ON public.citation_replacement_jobs
  FOR SELECT
  USING (auth.uid() = created_by);

-- Allow service role to update jobs (for edge functions)
CREATE POLICY "Service role can update citation replacement jobs"
  ON public.citation_replacement_jobs
  FOR UPDATE
  USING (true);