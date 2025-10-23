-- Create table for link validation results
CREATE TABLE IF NOT EXISTS public.link_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  article_language TEXT NOT NULL,
  article_topic TEXT,
  external_links JSONB DEFAULT '[]'::jsonb,
  internal_links JSONB DEFAULT '[]'::jsonb,
  broken_links_count INTEGER DEFAULT 0,
  language_mismatch_count INTEGER DEFAULT 0,
  irrelevant_links_count INTEGER DEFAULT 0,
  validation_status TEXT DEFAULT 'pending',
  validation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.link_validations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all link validations" 
ON public.link_validations 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert link validations" 
ON public.link_validations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update link validations" 
ON public.link_validations 
FOR UPDATE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_link_validations_article_id ON public.link_validations(article_id);
CREATE INDEX idx_link_validations_status ON public.link_validations(validation_status);
CREATE INDEX idx_link_validations_date ON public.link_validations(validation_date DESC);