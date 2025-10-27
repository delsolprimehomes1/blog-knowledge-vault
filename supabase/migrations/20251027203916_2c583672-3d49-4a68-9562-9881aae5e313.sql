-- Create function for atomic citation tracking replacement
-- This eliminates race conditions by handling everything in a single database transaction
CREATE OR REPLACE FUNCTION replace_citation_tracking(
  p_article_id UUID,
  p_old_url TEXT,
  p_new_url TEXT,
  p_new_source TEXT,
  p_anchor_text TEXT
) RETURNS VOID AS $$
BEGIN
  -- Delete old URL tracking
  DELETE FROM citation_usage_tracking 
  WHERE article_id = p_article_id AND citation_url = p_old_url;
  
  -- Insert or update new URL tracking (truly atomic with PostgreSQL locking)
  INSERT INTO citation_usage_tracking (
    article_id, 
    citation_url, 
    citation_source, 
    anchor_text, 
    is_active, 
    last_verified_at, 
    updated_at
  ) VALUES (
    p_article_id, 
    p_new_url, 
    p_new_source, 
    p_anchor_text,
    true, 
    NOW(), 
    NOW()
  )
  ON CONFLICT (article_id, citation_url)
  DO UPDATE SET
    citation_source = EXCLUDED.citation_source,
    anchor_text = EXCLUDED.anchor_text,
    is_active = true,
    last_verified_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;