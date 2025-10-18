-- Update meta_title constraint to allow up to 70 characters (Google's current display limit)
ALTER TABLE public.blog_articles 
DROP CONSTRAINT IF EXISTS meta_title_length;

ALTER TABLE public.blog_articles 
ADD CONSTRAINT meta_title_length 
CHECK (char_length(meta_title) <= 70);