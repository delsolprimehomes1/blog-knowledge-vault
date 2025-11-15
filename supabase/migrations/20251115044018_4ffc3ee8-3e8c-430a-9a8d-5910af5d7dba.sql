-- Create translation_status table
CREATE TABLE IF NOT EXISTS public.translation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  
  -- Translation State
  has_translation BOOLEAN NOT NULL DEFAULT false,
  translation_article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  translation_slug TEXT,
  
  -- Completeness Metrics
  completeness_score INTEGER NOT NULL DEFAULT 0,
  total_languages INTEGER NOT NULL,
  linked_languages INTEGER NOT NULL DEFAULT 0,
  missing_languages TEXT[] DEFAULT '{}',
  
  -- Quality Metrics
  bidirectional_valid BOOLEAN DEFAULT true,
  url_exists BOOLEAN DEFAULT true,
  content_similarity_score INTEGER,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status Tracking
  validation_status TEXT NOT NULL DEFAULT 'pending',
  blocking_issues TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  validated_by UUID,
  
  UNIQUE(article_id, language_code)
);

-- Create indexes for translation_status
CREATE INDEX IF NOT EXISTS idx_translation_status_article ON public.translation_status(article_id);
CREATE INDEX IF NOT EXISTS idx_translation_status_language ON public.translation_status(language_code);
CREATE INDEX IF NOT EXISTS idx_translation_status_validation ON public.translation_status(validation_status);
CREATE INDEX IF NOT EXISTS idx_translation_status_completeness ON public.translation_status(completeness_score);

-- Enable RLS on translation_status
ALTER TABLE public.translation_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for translation_status
CREATE POLICY "Admins can view translation status"
  ON public.translation_status FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage translation status"
  ON public.translation_status FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create translation_audit_log table
CREATE TABLE IF NOT EXISTS public.translation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  
  -- Change Details
  change_type TEXT NOT NULL,
  affected_language TEXT NOT NULL,
  
  -- Before/After State
  previous_translation_slug TEXT,
  new_translation_slug TEXT,
  previous_status TEXT,
  new_status TEXT,
  
  -- Context
  changed_by UUID,
  change_reason TEXT,
  validation_result JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  article_headline TEXT,
  article_status TEXT
);

-- Create indexes for translation_audit_log
CREATE INDEX IF NOT EXISTS idx_translation_audit_article ON public.translation_audit_log(article_id);
CREATE INDEX IF NOT EXISTS idx_translation_audit_language ON public.translation_audit_log(affected_language);
CREATE INDEX IF NOT EXISTS idx_translation_audit_type ON public.translation_audit_log(change_type);
CREATE INDEX IF NOT EXISTS idx_translation_audit_date ON public.translation_audit_log(created_at DESC);

-- Enable RLS on translation_audit_log
ALTER TABLE public.translation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for translation_audit_log
CREATE POLICY "Admins can view audit log"
  ON public.translation_audit_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can insert audit log"
  ON public.translation_audit_log FOR INSERT
  WITH CHECK (true);

-- Helper function: calculate_translation_completeness
CREATE OR REPLACE FUNCTION public.calculate_translation_completeness(
  p_article_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_languages INTEGER;
  v_linked_languages INTEGER;
  v_completeness INTEGER;
  v_translations JSONB;
BEGIN
  -- Get total active languages
  SELECT COUNT(*) INTO v_total_languages
  FROM public.site_languages
  WHERE is_active = true;
  
  -- Get translations JSONB
  SELECT translations INTO v_translations
  FROM public.blog_articles
  WHERE id = p_article_id;
  
  -- Count linked languages (current language + translations)
  IF v_translations IS NULL THEN
    v_linked_languages := 1;
  ELSE
    v_linked_languages := 1 + (SELECT COUNT(*) FROM jsonb_object_keys(v_translations));
  END IF;
  
  -- Calculate percentage
  IF v_total_languages > 0 THEN
    v_completeness := (v_linked_languages::FLOAT / v_total_languages * 100)::INTEGER;
  ELSE
    v_completeness := 0;
  END IF;
  
  RETURN v_completeness;
END;
$$;

-- Helper function: get_missing_languages
CREATE OR REPLACE FUNCTION public.get_missing_languages(
  p_article_id UUID
) RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_language TEXT;
  v_translations JSONB;
  v_missing TEXT[];
BEGIN
  -- Get article language and translations
  SELECT language, translations INTO v_current_language, v_translations
  FROM public.blog_articles
  WHERE id = p_article_id;
  
  -- Find missing languages
  SELECT ARRAY_AGG(language_code)
  INTO v_missing
  FROM public.site_languages
  WHERE is_active = true
    AND language_code != v_current_language
    AND (v_translations IS NULL OR NOT (v_translations ? language_code));
  
  RETURN COALESCE(v_missing, '{}');
END;
$$;

-- Add trigger to update updated_at on translation_status
CREATE OR REPLACE FUNCTION public.update_translation_status_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_translation_status_updated_at
  BEFORE UPDATE ON public.translation_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_translation_status_timestamp();