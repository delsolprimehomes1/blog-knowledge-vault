-- Create table for tracking bulk recitation jobs
CREATE TABLE IF NOT EXISTS public.bulk_recitation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  total_new_citations INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bulk_recitation_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own jobs
CREATE POLICY "Users can view their own jobs"
  ON public.bulk_recitation_jobs
  FOR SELECT
  USING (auth.uid() = created_by);

-- Allow authenticated users to create jobs
CREATE POLICY "Users can create jobs"
  ON public.bulk_recitation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Allow service role to update jobs (for edge function)
CREATE POLICY "Service role can update jobs"
  ON public.bulk_recitation_jobs
  FOR UPDATE
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_recitation_jobs_status ON public.bulk_recitation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_recitation_jobs_created_by ON public.bulk_recitation_jobs(created_by);