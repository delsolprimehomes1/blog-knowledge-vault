-- Drop the foreign key constraint that prevents auto-clustering
-- cluster_id should be a simple UUID grouping field, not tied to cluster_generations
ALTER TABLE blog_articles 
DROP CONSTRAINT IF EXISTS blog_articles_cluster_id_fkey;