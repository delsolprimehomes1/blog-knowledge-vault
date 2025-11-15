import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Redirects legacy /blog/:slug URLs to language-aware /:lang/blog/:slug URLs
 * Queries the database to determine the article's language
 */
export const BlogLegacyRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToLanguageAwareUrl = async () => {
      if (!slug) {
        navigate('/en/blog');
        return;
      }

      try {
        // Query the article to get its language
        const { data: article, error } = await supabase
          .from('blog_articles')
          .select('language, slug')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (error || !article) {
          // Article not found, redirect to 404
          navigate('/404', { replace: true });
          return;
        }

        // Redirect to the language-aware URL
        const languagePrefix = article.language || 'en';
        navigate(`/${languagePrefix}/blog/${article.slug}`, { replace: true });
      } catch (error) {
        console.error('Error fetching article for redirect:', error);
        navigate('/404', { replace: true });
      }
    };

    redirectToLanguageAwareUrl();
  }, [slug, navigate]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};
