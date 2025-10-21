-- Add multi-cluster support columns to cluster_generations
ALTER TABLE cluster_generations
ADD COLUMN IF NOT EXISTS cluster_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_articles INTEGER,
ADD COLUMN IF NOT EXISTS articles_per_cluster INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS cluster_focus_areas JSONB;

-- Add cluster tracking to blog_articles
ALTER TABLE blog_articles
ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES cluster_generations(id),
ADD COLUMN IF NOT EXISTS cluster_number INTEGER,
ADD COLUMN IF NOT EXISTS cluster_theme TEXT;