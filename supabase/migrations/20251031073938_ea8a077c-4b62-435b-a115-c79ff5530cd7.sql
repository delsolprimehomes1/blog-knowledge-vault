-- Phase 7: Internal Link & Crawl Validation - Database Schema

-- Add link depth and validation tracking to blog_articles
ALTER TABLE public.blog_articles 
ADD COLUMN IF NOT EXISTS link_depth INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS last_link_validation TIMESTAMPTZ;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_blog_articles_link_validation 
ON public.blog_articles(last_link_validation, status);

-- Create link validation alerts table
CREATE TABLE IF NOT EXISTS public.link_validation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'broken_links', 'low_score', 'missing_patterns', 'high_depth'
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient alert queries
CREATE INDEX IF NOT EXISTS idx_link_validation_alerts_active 
ON public.link_validation_alerts(is_resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_validation_alerts_article 
ON public.link_validation_alerts(article_id, is_resolved);

-- Create article link patterns tracking table
CREATE TABLE IF NOT EXISTS public.article_link_patterns (
  article_id UUID PRIMARY KEY REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  has_parent_category_link BOOLEAN DEFAULT FALSE,
  has_related_article_link BOOLEAN DEFAULT FALSE,
  has_service_link BOOLEAN DEFAULT FALSE,
  parent_category_url TEXT,
  related_article_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  service_link_url TEXT,
  total_internal_links INTEGER DEFAULT 0,
  total_external_links INTEGER DEFAULT 0,
  compliance_score INTEGER DEFAULT 0, -- 0-100
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  last_validated_by TEXT
);

-- Create index for pattern queries
CREATE INDEX IF NOT EXISTS idx_article_link_patterns_compliance 
ON public.article_link_patterns(compliance_score);

-- Enable RLS on new tables
ALTER TABLE public.link_validation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_link_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for link_validation_alerts
CREATE POLICY "Admins can view all alerts"
ON public.link_validation_alerts
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert alerts"
ON public.link_validation_alerts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update alerts"
ON public.link_validation_alerts
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- RLS Policies for article_link_patterns
CREATE POLICY "Admins can view all patterns"
ON public.article_link_patterns
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert patterns"
ON public.article_link_patterns
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update patterns"
ON public.article_link_patterns
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create function to auto-update article_link_patterns when blog_articles change
CREATE OR REPLACE FUNCTION public.update_link_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract and count links from internal_links and external_citations JSONB
  INSERT INTO public.article_link_patterns (
    article_id,
    total_internal_links,
    total_external_links,
    last_updated
  )
  VALUES (
    NEW.id,
    COALESCE(jsonb_array_length(NEW.internal_links), 0),
    COALESCE(jsonb_array_length(NEW.external_citations), 0),
    NOW()
  )
  ON CONFLICT (article_id) 
  DO UPDATE SET
    total_internal_links = COALESCE(jsonb_array_length(NEW.internal_links), 0),
    total_external_links = COALESCE(jsonb_array_length(NEW.external_citations), 0),
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update patterns on article changes
DROP TRIGGER IF EXISTS trigger_update_link_patterns ON public.blog_articles;
CREATE TRIGGER trigger_update_link_patterns
AFTER INSERT OR UPDATE OF internal_links, external_citations ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_link_patterns();

-- Comment tables for documentation
COMMENT ON TABLE public.link_validation_alerts IS 'Stores alerts for link validation issues requiring attention';
COMMENT ON TABLE public.article_link_patterns IS 'Tracks link patterns and compliance for each article';
COMMENT ON COLUMN public.blog_articles.link_depth IS 'Number of clicks from homepage to reach this article';
COMMENT ON COLUMN public.blog_articles.last_link_validation IS 'Last time this article''s links were validated';