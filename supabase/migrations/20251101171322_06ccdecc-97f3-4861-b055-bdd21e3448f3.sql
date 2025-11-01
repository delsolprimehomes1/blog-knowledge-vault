-- Add context_paragraph_index to track where citations appear in article body
ALTER TABLE citation_usage_tracking 
ADD COLUMN IF NOT EXISTS context_paragraph_index INTEGER;

COMMENT ON COLUMN citation_usage_tracking.context_paragraph_index IS 
'The paragraph number (0-indexed) where this citation appears in the article body';