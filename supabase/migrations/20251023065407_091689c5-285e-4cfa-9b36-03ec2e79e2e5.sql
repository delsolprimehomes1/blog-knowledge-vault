-- Add missing columns to link_validations table if they don't exist
ALTER TABLE link_validations 
ADD COLUMN IF NOT EXISTS recommendations JSONB;

-- Rename validation_status to status for consistency
ALTER TABLE link_validations 
RENAME COLUMN validation_status TO status;

-- Create link_suggestions table
CREATE TABLE IF NOT EXISTS link_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES blog_articles(id) ON DELETE CASCADE,
  old_url TEXT NOT NULL,
  suggested_url TEXT NOT NULL,
  reason TEXT NOT NULL,
  relevance_score INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for link_suggestions
CREATE INDEX IF NOT EXISTS idx_link_suggestions_article ON link_suggestions(article_id);
CREATE INDEX IF NOT EXISTS idx_link_suggestions_status ON link_suggestions(status);

-- Add RLS policies for link_suggestions
ALTER TABLE link_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all link suggestions"
  ON link_suggestions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert link suggestions"
  ON link_suggestions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update link suggestions"
  ON link_suggestions
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete link suggestions"
  ON link_suggestions
  FOR DELETE
  USING (true);