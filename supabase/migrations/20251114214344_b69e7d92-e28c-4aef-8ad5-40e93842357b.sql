-- Extend citation_usage_tracking for enhanced citation features
ALTER TABLE citation_usage_tracking
ADD COLUMN IF NOT EXISTS target_sentence TEXT,
ADD COLUMN IF NOT EXISTS suggested_anchor TEXT,
ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
ADD COLUMN IF NOT EXISTS insertion_location INTEGER;

-- Add index for performance on confidence score queries
CREATE INDEX IF NOT EXISTS idx_citation_confidence ON citation_usage_tracking(confidence_score DESC) WHERE confidence_score IS NOT NULL;

-- Create citation_quality_scores table for detailed analytics
CREATE TABLE IF NOT EXISTS citation_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_id UUID REFERENCES citation_usage_tracking(id) ON DELETE CASCADE,
  authority_score INTEGER CHECK (authority_score >= 0 AND authority_score <= 100),
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
  recency_score INTEGER CHECK (recency_score >= 0 AND recency_score <= 100),
  diversity_score INTEGER CHECK (diversity_score >= 0 AND diversity_score <= 100),
  final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on citation_quality_scores
ALTER TABLE citation_quality_scores ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read quality scores
CREATE POLICY "Users can view citation quality scores"
  ON citation_quality_scores FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "Service role can manage citation quality scores"
  ON citation_quality_scores FOR ALL
  USING (auth.role() = 'service_role');

-- Add index for citation_id lookups
CREATE INDEX IF NOT EXISTS idx_quality_scores_citation ON citation_quality_scores(citation_id);

-- Add trigger for updated_at
CREATE TRIGGER update_citation_quality_scores_updated_at
  BEFORE UPDATE ON citation_quality_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();