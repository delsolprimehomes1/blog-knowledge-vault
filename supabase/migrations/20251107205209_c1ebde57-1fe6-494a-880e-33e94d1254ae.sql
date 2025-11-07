-- Create cluster_article_chunks table for one-article-at-a-time processing
CREATE TABLE IF NOT EXISTS public.cluster_article_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_job_id UUID NOT NULL REFERENCES public.cluster_generations(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  article_plan JSONB NOT NULL,
  article_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(parent_job_id, chunk_number)
);

-- Create indexes for efficient querying
CREATE INDEX idx_article_chunks_status ON public.cluster_article_chunks(parent_job_id, status);
CREATE INDEX idx_article_chunks_pending ON public.cluster_article_chunks(status, updated_at) WHERE status IN ('pending', 'processing');

-- Enable RLS
ALTER TABLE public.cluster_article_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own chunks" ON public.cluster_article_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cluster_generations
      WHERE cluster_generations.id = cluster_article_chunks.parent_job_id
      AND cluster_generations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert chunks" ON public.cluster_article_chunks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update chunks" ON public.cluster_article_chunks
  FOR UPDATE USING (true);