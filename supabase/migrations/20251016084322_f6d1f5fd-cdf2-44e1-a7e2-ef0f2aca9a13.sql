-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('article-images', 'article-images', true);

-- Create RLS policies for article images bucket
CREATE POLICY "Public can view article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Anyone can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "Anyone can update their article images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'article-images');

CREATE POLICY "Anyone can delete article images"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-images');