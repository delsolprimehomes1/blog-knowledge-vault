-- Create external_citation_health table
CREATE TABLE IF NOT EXISTS external_citation_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  source_name TEXT,
  last_checked_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'dead', 'redirected', 'ssl_error', 'timeout')),
  http_status_code INTEGER,
  response_time_ms INTEGER,
  redirect_url TEXT,
  content_hash TEXT,
  page_title TEXT,
  is_government_source BOOLEAN DEFAULT false,
  language TEXT,
  times_verified INTEGER DEFAULT 0,
  times_failed INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citation_health_url ON external_citation_health(url);
CREATE INDEX IF NOT EXISTS idx_citation_health_status ON external_citation_health(status);
CREATE INDEX IF NOT EXISTS idx_citation_health_last_checked ON external_citation_health(last_checked_at);

-- Enable RLS
ALTER TABLE external_citation_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to citation health"
ON external_citation_health FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated update to citation health"
ON external_citation_health FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert to citation health"
ON external_citation_health FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create citation_usage_tracking table
CREATE TABLE IF NOT EXISTS citation_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES blog_articles(id) ON DELETE CASCADE,
  citation_url TEXT NOT NULL,
  citation_source TEXT,
  anchor_text TEXT,
  first_added_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  position_in_article INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, citation_url)
);

CREATE INDEX IF NOT EXISTS idx_citation_usage_article ON citation_usage_tracking(article_id);
CREATE INDEX IF NOT EXISTS idx_citation_usage_url ON citation_usage_tracking(citation_url);
CREATE INDEX IF NOT EXISTS idx_citation_usage_active ON citation_usage_tracking(is_active);

-- Enable RLS
ALTER TABLE citation_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to citation usage"
ON citation_usage_tracking FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated update to citation usage"
ON citation_usage_tracking FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create dead_link_replacements table
CREATE TABLE IF NOT EXISTS dead_link_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url TEXT NOT NULL,
  original_source TEXT,
  replacement_url TEXT NOT NULL,
  replacement_source TEXT,
  replacement_reason TEXT,
  confidence_score DECIMAL(3,2),
  suggested_by TEXT DEFAULT 'auto',
  applied_to_articles UUID[],
  status TEXT CHECK (status IN ('suggested', 'approved', 'rejected', 'applied')) DEFAULT 'suggested',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_link_replacements_original ON dead_link_replacements(original_url);
CREATE INDEX IF NOT EXISTS idx_dead_link_replacements_status ON dead_link_replacements(status);

-- Enable RLS
ALTER TABLE dead_link_replacements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to dead link replacements"
ON dead_link_replacements FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert to dead link replacements"
ON dead_link_replacements FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update to dead link replacements"
ON dead_link_replacements FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add columns to blog_articles
ALTER TABLE blog_articles
ADD COLUMN IF NOT EXISTS citation_health_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS last_citation_check_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_dead_citations BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_citation_health ON blog_articles(citation_health_score);
CREATE INDEX IF NOT EXISTS idx_articles_has_dead_citations ON blog_articles(has_dead_citations);

-- Create trigger function to track citation usage
CREATE OR REPLACE FUNCTION track_citation_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old tracking records for this article
  DELETE FROM citation_usage_tracking WHERE article_id = NEW.id;
  
  -- Insert new tracking records
  IF NEW.external_citations IS NOT NULL AND jsonb_array_length(NEW.external_citations) > 0 THEN
    INSERT INTO citation_usage_tracking (article_id, citation_url, citation_source, anchor_text, position_in_article)
    SELECT 
      NEW.id,
      (citation->>'url')::TEXT,
      (citation->>'source')::TEXT,
      (citation->>'text')::TEXT,
      ROW_NUMBER() OVER ()::INTEGER
    FROM jsonb_array_elements(NEW.external_citations) AS citation
    WHERE citation->>'url' IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS track_article_citations ON blog_articles;
CREATE TRIGGER track_article_citations
AFTER INSERT OR UPDATE OF external_citations ON blog_articles
FOR EACH ROW
EXECUTE FUNCTION track_citation_usage();