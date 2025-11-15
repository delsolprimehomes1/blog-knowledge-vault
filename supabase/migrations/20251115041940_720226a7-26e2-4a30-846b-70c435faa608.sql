-- Create site_languages table for centralized language configuration
CREATE TABLE site_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL UNIQUE,
  language_name TEXT NOT NULL,
  hreflang_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  url_prefix TEXT,
  display_flag TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial languages
INSERT INTO site_languages (language_code, language_name, hreflang_code, is_default, display_flag, sort_order) VALUES
  ('en', 'English', 'en-GB', true, '🇬🇧', 1),
  ('de', 'German', 'de-DE', false, '🇩🇪', 2),
  ('nl', 'Dutch', 'nl-NL', false, '🇳🇱', 3),
  ('fr', 'French', 'fr-FR', false, '🇫🇷', 4),
  ('pl', 'Polish', 'pl-PL', false, '🇵🇱', 5),
  ('sv', 'Swedish', 'sv-SE', false, '🇸🇪', 6),
  ('da', 'Danish', 'da-DK', false, '🇩🇰', 7),
  ('hu', 'Hungarian', 'hu-HU', false, '🇭🇺', 8);

-- RLS Policies for site_languages
ALTER TABLE site_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON site_languages FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON site_languages FOR ALL USING (auth.uid() IS NOT NULL);

-- Create page_translations table for translation mapping
CREATE TABLE page_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL,
  page_identifier TEXT,
  language_code TEXT NOT NULL,
  url_slug TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_type, page_identifier, language_code)
);

-- RLS Policies for page_translations
ALTER TABLE page_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON page_translations FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON page_translations FOR ALL USING (auth.uid() IS NOT NULL);