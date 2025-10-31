-- Add related_cluster_articles field to blog_articles table
ALTER TABLE blog_articles 
ADD COLUMN related_cluster_articles JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX idx_blog_articles_related_cluster_articles ON blog_articles USING GIN (related_cluster_articles);

COMMENT ON COLUMN blog_articles.related_cluster_articles IS 'Pre-calculated sibling articles within same cluster for MidClusterCTA feature. Format: [{"id": "uuid", "slug": "slug", "headline": "title", "stage": "TOFU|MOFU|BOFU"}]';