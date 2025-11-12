-- Create sitemap_validations table
CREATE TABLE sitemap_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Coverage Metrics
  total_published_articles INTEGER NOT NULL,
  articles_in_sitemap INTEGER NOT NULL,
  coverage_percentage NUMERIC(5,2) NOT NULL,
  missing_article_slugs JSONB DEFAULT '[]'::jsonb,
  
  -- Quality Metrics
  articles_with_lastmod INTEGER NOT NULL DEFAULT 0,
  articles_with_images INTEGER NOT NULL DEFAULT 0,
  articles_with_priority INTEGER NOT NULL DEFAULT 0,
  articles_with_changefreq INTEGER NOT NULL DEFAULT 0,
  
  -- Technical Validation
  xml_is_valid BOOLEAN NOT NULL DEFAULT false,
  xml_validation_errors JSONB DEFAULT '[]'::jsonb,
  total_urls INTEGER NOT NULL,
  sitemap_file_size_kb INTEGER,
  
  -- Link Health
  broken_urls_count INTEGER DEFAULT 0,
  broken_urls JSONB DEFAULT '[]'::jsonb,
  
  -- Image Sitemap
  total_images INTEGER DEFAULT 0,
  images_with_caption INTEGER DEFAULT 0,
  images_with_title INTEGER DEFAULT 0,
  
  -- Submission Tracking
  last_submitted_to_gsc TIMESTAMPTZ,
  last_submitted_to_bing TIMESTAMPTZ,
  
  -- Health Score (0-100)
  health_score INTEGER NOT NULL,
  
  -- Recommendations
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  validation_duration_ms INTEGER,
  validated_by UUID
);

-- Create sitemap_alerts table
CREATE TABLE sitemap_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolution_notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_sitemap_validations_created_at ON sitemap_validations(created_at DESC);
CREATE INDEX idx_sitemap_validations_health_score ON sitemap_validations(health_score);
CREATE INDEX idx_sitemap_alerts_active ON sitemap_alerts(created_at DESC) WHERE NOT is_resolved;

-- Enable RLS
ALTER TABLE sitemap_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitemap_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sitemap_validations
CREATE POLICY "Admins can view sitemap validations"
  ON sitemap_validations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert sitemap validations"
  ON sitemap_validations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for sitemap_alerts
CREATE POLICY "Admins can view sitemap alerts"
  ON sitemap_alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert sitemap alerts"
  ON sitemap_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update sitemap alerts"
  ON sitemap_alerts FOR UPDATE
  USING (auth.uid() IS NOT NULL);