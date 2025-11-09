-- Auto-set reviewer to author when publishing articles
-- This ensures all published articles have a reviewer set

CREATE OR REPLACE FUNCTION public.auto_set_reviewer_from_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-set reviewer to author when publishing if reviewer is not set
  IF NEW.status = 'published' 
     AND NEW.author_id IS NOT NULL 
     AND NEW.reviewer_id IS NULL THEN
    NEW.reviewer_id := NEW.author_id;
    RAISE NOTICE 'Auto-set reviewer_id to author_id: %', NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert or update on blog_articles
CREATE TRIGGER trigger_auto_set_reviewer
  BEFORE INSERT OR UPDATE ON public.blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_reviewer_from_author();