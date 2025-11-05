-- Phase 1: Fix citation compliance alerts unique constraint
-- This is critical for the scan function to save detected violations

-- Add unique constraint for upsert operations
ALTER TABLE public.citation_compliance_alerts
ADD CONSTRAINT citation_compliance_alerts_unique_key 
UNIQUE (article_id, citation_url, alert_type);

-- Create supporting index for performance
CREATE INDEX IF NOT EXISTS idx_citation_compliance_alerts_unique 
ON public.citation_compliance_alerts(article_id, citation_url, alert_type);

-- Create index for common queries (filtering by alert type and resolution status)
CREATE INDEX IF NOT EXISTS idx_citation_compliance_alerts_type_resolved 
ON public.citation_compliance_alerts(alert_type, resolved_at);

-- Phase 2: Create citation hygiene reports table
-- Table to store historical citation hygiene scan reports
CREATE TABLE IF NOT EXISTS public.citation_hygiene_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_articles_scanned INTEGER NOT NULL,
  total_citations_scanned INTEGER NOT NULL,
  banned_citations_found INTEGER NOT NULL,
  articles_with_violations INTEGER NOT NULL,
  clean_replacements_applied INTEGER DEFAULT 0,
  articles_cleaned INTEGER DEFAULT 0,
  violations_by_domain JSONB DEFAULT '{}'::jsonb,
  violations_by_language JSONB DEFAULT '{}'::jsonb,
  top_offenders JSONB DEFAULT '[]'::jsonb,
  compliance_score DECIMAL(5,2) NOT NULL,
  next_scan_scheduled TIMESTAMP WITH TIME ZONE,
  scan_duration_ms INTEGER,
  auto_replacement_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.citation_hygiene_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view all reports, service role can insert
CREATE POLICY "Admins can view hygiene reports"
ON public.citation_hygiene_reports
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert reports"
ON public.citation_hygiene_reports
FOR INSERT
WITH CHECK (true);

-- Index for efficient querying (newest first)
CREATE INDEX idx_citation_hygiene_reports_scan_date 
ON public.citation_hygiene_reports(scan_date DESC);

-- Index for filtering by compliance score
CREATE INDEX idx_citation_hygiene_reports_compliance 
ON public.citation_hygiene_reports(compliance_score);