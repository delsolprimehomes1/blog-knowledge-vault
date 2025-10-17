-- Create table for tracking cluster generation jobs
CREATE TABLE cluster_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  topic TEXT NOT NULL,
  language TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  primary_keyword TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress JSONB DEFAULT '{"current_step": 0, "total_steps": 11, "current_article": 0, "total_articles": 6}'::jsonb,
  articles JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE cluster_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own generations
CREATE POLICY "Users can view own generations"
  ON cluster_generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own generations
CREATE POLICY "Users can insert own generations"
  ON cluster_generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update all generations (for edge function background processing)
CREATE POLICY "Service role can update"
  ON cluster_generations
  FOR UPDATE
  USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_cluster_generations_user_id ON cluster_generations(user_id);
CREATE INDEX idx_cluster_generations_status ON cluster_generations(status);