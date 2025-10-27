-- Create content_updates tracking table
CREATE TABLE IF NOT EXISTS public.content_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('statistics', 'citations', 'faq', 'content', 'translations', 'bulk_refresh')),
  updated_fields JSONB DEFAULT '[]'::jsonb,
  previous_date_modified TIMESTAMP WITH TIME ZONE,
  new_date_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  update_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to content updates"
  ON public.content_updates FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert content updates"
  ON public.content_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Index for performance
CREATE INDEX idx_content_updates_article_id ON public.content_updates(article_id);
CREATE INDEX idx_content_updates_created_at ON public.content_updates(created_at DESC);

-- Add citation metadata columns to external_citation_health
ALTER TABLE public.external_citation_health 
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('government', 'news', 'legal', 'academic', 'organization', 'commercial')),
  ADD COLUMN IF NOT EXISTS authority_score INTEGER CHECK (authority_score >= 0 AND authority_score <= 100),
  ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create view for content freshness monitoring
CREATE OR REPLACE VIEW public.content_freshness_report AS
SELECT 
  id,
  slug,
  headline,
  language,
  status,
  date_published,
  date_modified,
  CASE 
    WHEN date_modified IS NULL THEN 'never_updated'
    WHEN date_modified < NOW() - INTERVAL '90 days' THEN 'stale'
    WHEN date_modified < NOW() - INTERVAL '30 days' THEN 'needs_refresh'
    ELSE 'fresh'
  END AS freshness_status,
  EXTRACT(DAY FROM NOW() - COALESCE(date_modified, date_published)) AS days_since_update,
  (SELECT COUNT(*) FROM public.content_updates WHERE article_id = blog_articles.id) AS update_count
FROM public.blog_articles
WHERE status = 'published'
ORDER BY COALESCE(date_modified, date_published) ASC;