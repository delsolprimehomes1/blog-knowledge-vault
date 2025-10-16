-- Create authors table
CREATE TABLE public.authors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  job_title text NOT NULL,
  bio text NOT NULL,
  photo_url text NOT NULL,
  linkedin_url text NOT NULL,
  credentials text[] DEFAULT '{}',
  years_experience integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create blog_articles table
CREATE TABLE public.blog_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  language text NOT NULL,
  category text NOT NULL,
  funnel_stage text NOT NULL,
  
  -- SEO Fields
  headline text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  canonical_url text,
  
  -- Content Fields
  speakable_answer text NOT NULL,
  detailed_content text NOT NULL,
  featured_image_url text NOT NULL,
  featured_image_alt text NOT NULL,
  featured_image_caption text,
  diagram_url text,
  diagram_description text,
  
  -- E-E-A-T Fields
  author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES public.authors(id) ON DELETE SET NULL,
  date_published timestamp with time zone,
  date_modified timestamp with time zone,
  read_time integer,
  
  -- Linking Fields
  internal_links jsonb DEFAULT '[]',
  external_citations jsonb DEFAULT '[]',
  related_article_ids uuid[] DEFAULT '{}',
  cta_article_ids uuid[] DEFAULT '{}',
  
  -- Translations
  translations jsonb DEFAULT '{}',
  
  -- FAQ
  faq_entities jsonb,
  
  -- Status
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_language CHECK (language IN ('en', 'es', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu')),
  CONSTRAINT valid_funnel_stage CHECK (funnel_stage IN ('TOFU', 'MOFU', 'BOFU')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT meta_title_length CHECK (char_length(meta_title) <= 60),
  CONSTRAINT meta_description_length CHECK (char_length(meta_description) <= 160)
);

-- Create indexes for better performance
CREATE INDEX idx_blog_articles_slug ON public.blog_articles(slug);
CREATE INDEX idx_blog_articles_language ON public.blog_articles(language);
CREATE INDEX idx_blog_articles_category ON public.blog_articles(category);
CREATE INDEX idx_blog_articles_funnel_stage ON public.blog_articles(funnel_stage);
CREATE INDEX idx_blog_articles_author_id ON public.blog_articles(author_id);
CREATE INDEX idx_blog_articles_status ON public.blog_articles(status);
CREATE INDEX idx_blog_articles_date_published ON public.blog_articles(date_published);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blog_articles_updated_at
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (but no policies yet - public admin interface)
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing (you can restrict these later)
CREATE POLICY "Allow public read access to authors" ON public.authors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to blog_articles" ON public.blog_articles FOR SELECT USING (true);

CREATE POLICY "Allow public insert to authors" ON public.authors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to blog_articles" ON public.blog_articles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to authors" ON public.authors FOR UPDATE USING (true);
CREATE POLICY "Allow public update to categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Allow public update to blog_articles" ON public.blog_articles FOR UPDATE USING (true);

CREATE POLICY "Allow public delete from authors" ON public.authors FOR DELETE USING (true);
CREATE POLICY "Allow public delete from categories" ON public.categories FOR DELETE USING (true);
CREATE POLICY "Allow public delete from blog_articles" ON public.blog_articles FOR DELETE USING (true);

-- Insert sample authors
INSERT INTO public.authors (name, job_title, bio, photo_url, linkedin_url, credentials, years_experience) VALUES
  (
    'Hans Beeckman',
    'Senior Real Estate Market Analyst',
    'Hans Beeckman is a seasoned real estate expert with over 15 years of experience analyzing European property markets. With a background in economics and urban development, Hans specializes in identifying market trends and providing data-driven insights for investors and homebuyers. His expertise spans residential, commercial, and industrial real estate sectors across multiple European countries.',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    'https://linkedin.com/in/hansbeeckman',
    ARRAY['Certified Real Estate Analyst (CREA)', 'European Property Specialist', 'Master in Urban Economics'],
    15
  ),
  (
    'María Sánchez',
    'International Property Investment Consultant',
    'María Sánchez is a multilingual property investment specialist with 12 years of experience guiding international clients through complex real estate transactions. Fluent in five languages, María has helped hundreds of clients successfully navigate property purchases across Spain, Portugal, France, and beyond. Her holistic approach combines financial analysis, legal compliance, and cultural insights to ensure successful property investments.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    'https://linkedin.com/in/mariasanchezrealestate',
    ARRAY['Licensed Real Estate Broker', 'International Property Consultant', 'MBA in Finance'],
    12
  );

-- Insert sample categories
INSERT INTO public.categories (name, slug) VALUES
  ('Market Analysis', 'market-analysis'),
  ('Buying Guides', 'buying-guides'),
  ('Investment Strategies', 'investment-strategies'),
  ('Legal & Regulations', 'legal-regulations'),
  ('Property Management', 'property-management'),
  ('Location Insights', 'location-insights');