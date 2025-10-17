-- Ensure article-images storage bucket exists and has proper policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Add RLS policy for public read access to article-images
CREATE POLICY "Public read access to article-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

-- Add RLS policy for authenticated upload to article-images
CREATE POLICY "Authenticated users can upload to article-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'article-images' 
  AND auth.role() = 'authenticated'
);

-- Add RLS policy for authenticated update to article-images
CREATE POLICY "Authenticated users can update article-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'article-images' 
  AND auth.role() = 'authenticated'
);

-- Add RLS policy for authenticated delete from article-images
CREATE POLICY "Authenticated users can delete article-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'article-images' 
  AND auth.role() = 'authenticated'
);