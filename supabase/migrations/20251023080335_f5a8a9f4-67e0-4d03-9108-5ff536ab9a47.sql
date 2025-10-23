-- Create article_revisions table for rollback functionality
CREATE TABLE IF NOT EXISTS public.article_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE NOT NULL,
  revision_type TEXT NOT NULL,
  previous_content TEXT NOT NULL,
  previous_citations JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  replacement_id UUID REFERENCES public.dead_link_replacements(id),
  can_rollback BOOLEAN DEFAULT true,
  rollback_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_revisions_article ON public.article_revisions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_revisions_rollback ON public.article_revisions(rollback_expires_at) WHERE can_rollback = true;

-- Enable RLS
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all revisions" ON public.article_revisions
  FOR SELECT USING (true);

CREATE POLICY "Admins can create revisions" ON public.article_revisions
  FOR INSERT WITH CHECK (true);

-- Update dead_link_replacements table with new columns
ALTER TABLE public.dead_link_replacements 
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS replacement_count INTEGER DEFAULT 0;