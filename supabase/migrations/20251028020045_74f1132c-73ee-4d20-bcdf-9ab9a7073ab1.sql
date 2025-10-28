-- Add diagram alt text and caption fields to blog_articles table
ALTER TABLE blog_articles
ADD COLUMN diagram_alt TEXT,
ADD COLUMN diagram_caption TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN blog_articles.diagram_alt IS 'SEO-optimized alt text for diagram images (50-125 chars) - used for screen readers and crawlers';
COMMENT ON COLUMN blog_articles.diagram_caption IS 'Human-readable caption displayed under diagram (20-80 chars) - user-facing label';