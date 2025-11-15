-- Phase 1: Database Schema Enhancement for Domain-Aware Citation Engine

-- 1.1 Create approved_domains table with trust scores
CREATE TABLE IF NOT EXISTS public.approved_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  trust_score INTEGER NOT NULL CHECK (trust_score >= 1 AND trust_score <= 100),
  category TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')),
  is_allowed BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_approved_domains_domain ON public.approved_domains(domain);
CREATE INDEX IF NOT EXISTS idx_approved_domains_allowed ON public.approved_domains(is_allowed) WHERE is_allowed = true;

-- Enable RLS
ALTER TABLE public.approved_domains ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to approved domains"
  ON public.approved_domains FOR SELECT
  USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can manage approved domains"
  ON public.approved_domains FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 1.2 Enhance domain_usage_stats with diversity metrics
ALTER TABLE public.domain_usage_stats
ADD COLUMN IF NOT EXISTS articles_used_in INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_uses_per_article NUMERIC,
ADD COLUMN IF NOT EXISTS last_suggested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS times_suggested INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_rejected INTEGER DEFAULT 0;

-- 1.3 Create citation_scoring_log table
CREATE TABLE IF NOT EXISTS public.citation_scoring_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  citation_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  relevance_score NUMERIC,
  trust_score INTEGER,
  novelty_boost INTEGER,
  overuse_penalty NUMERIC,
  final_score NUMERIC,
  was_selected BOOLEAN DEFAULT false,
  suggested_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_citation_scoring_article ON public.citation_scoring_log(article_id);
CREATE INDEX IF NOT EXISTS idx_citation_scoring_domain ON public.citation_scoring_log(domain);
CREATE INDEX IF NOT EXISTS idx_citation_scoring_selected ON public.citation_scoring_log(was_selected);
CREATE INDEX IF NOT EXISTS idx_citation_scoring_suggested_at ON public.citation_scoring_log(suggested_at);

-- Enable RLS
ALTER TABLE public.citation_scoring_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view and insert
CREATE POLICY "Authenticated users can view scoring logs"
  ON public.citation_scoring_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert scoring logs"
  ON public.citation_scoring_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger to update approved_domains timestamp
CREATE OR REPLACE FUNCTION update_approved_domains_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_approved_domains_updated_at
  BEFORE UPDATE ON public.approved_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_approved_domains_timestamp();