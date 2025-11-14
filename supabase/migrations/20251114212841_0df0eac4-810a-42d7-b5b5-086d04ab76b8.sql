-- Phase 1: Add Domain Tracking to Citation Usage
ALTER TABLE public.citation_usage_tracking 
ADD COLUMN IF NOT EXISTS citation_domain TEXT;

-- Extract and populate domain from existing URLs
UPDATE public.citation_usage_tracking 
SET citation_domain = 
  SUBSTRING(citation_url FROM '(?:https?://)?(?:www\.)?([^/]+)')
WHERE citation_domain IS NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_citation_tracking_article_domain 
ON public.citation_usage_tracking(article_id, citation_domain);

CREATE INDEX IF NOT EXISTS idx_citation_tracking_domain 
ON public.citation_usage_tracking(citation_domain);

-- Phase 2: Create Global Domain Usage Stats Table
CREATE TABLE IF NOT EXISTS public.domain_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  total_uses INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  category TEXT,
  tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_stats_usage ON public.domain_usage_stats(total_uses ASC);
CREATE INDEX IF NOT EXISTS idx_domain_stats_last_used ON public.domain_usage_stats(last_used_at ASC);
CREATE INDEX IF NOT EXISTS idx_domain_stats_tier ON public.domain_usage_stats(tier);

-- Populate initial stats from existing citations
INSERT INTO public.domain_usage_stats (domain, total_uses, last_used_at)
SELECT 
  citation_domain,
  COUNT(*) as total_uses,
  MAX(first_added_at) as last_used_at
FROM public.citation_usage_tracking
WHERE citation_domain IS NOT NULL
GROUP BY citation_domain
ON CONFLICT (domain) DO UPDATE 
SET 
  total_uses = EXCLUDED.total_uses,
  last_used_at = EXCLUDED.last_used_at;

-- Phase 3: Create Trigger to Auto-Update Stats
CREATE OR REPLACE FUNCTION public.update_domain_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.domain_usage_stats (domain, total_uses, last_used_at)
  VALUES (NEW.citation_domain, 1, NOW())
  ON CONFLICT (domain) DO UPDATE 
  SET 
    total_uses = domain_usage_stats.total_uses + 1,
    last_used_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_domain_stats ON public.citation_usage_tracking;

CREATE TRIGGER trg_update_domain_stats
AFTER INSERT ON public.citation_usage_tracking
FOR EACH ROW
WHEN (NEW.citation_domain IS NOT NULL)
EXECUTE FUNCTION public.update_domain_usage_stats();