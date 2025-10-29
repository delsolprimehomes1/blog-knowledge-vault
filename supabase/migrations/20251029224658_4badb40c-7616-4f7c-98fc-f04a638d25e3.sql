-- Create citation_compliance_alerts table for monitoring and tracking violations
CREATE TABLE IF NOT EXISTS public.citation_compliance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('non_approved', 'competitor', 'broken_link', 'missing_gov_source')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  citation_url TEXT NOT NULL,
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  article_title TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  auto_suggested_replacement TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.citation_compliance_alerts ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all alerts
CREATE POLICY "Admins can view all compliance alerts"
ON public.citation_compliance_alerts
FOR SELECT
USING (true);

-- Allow admins to insert alerts
CREATE POLICY "Admins can insert compliance alerts"
ON public.citation_compliance_alerts
FOR INSERT
WITH CHECK (true);

-- Allow admins to update alerts
CREATE POLICY "Admins can update compliance alerts"
ON public.citation_compliance_alerts
FOR UPDATE
USING (true);

-- Allow admins to delete alerts
CREATE POLICY "Admins can delete compliance alerts"
ON public.citation_compliance_alerts
FOR DELETE
USING (true);

-- Create indexes for performance
CREATE INDEX idx_citation_compliance_alerts_article_id ON public.citation_compliance_alerts(article_id);
CREATE INDEX idx_citation_compliance_alerts_alert_type ON public.citation_compliance_alerts(alert_type);
CREATE INDEX idx_citation_compliance_alerts_severity ON public.citation_compliance_alerts(severity);
CREATE INDEX idx_citation_compliance_alerts_resolved ON public.citation_compliance_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_citation_compliance_alerts_updated_at
BEFORE UPDATE ON public.citation_compliance_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();