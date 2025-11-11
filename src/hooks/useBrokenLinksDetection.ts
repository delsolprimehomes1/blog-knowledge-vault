import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BrokenLinkInfo {
  articleId: string;
  articleSlug: string;
  articleHeadline: string;
  brokenLinksCount: number;
}

interface BrokenLinksStats {
  totalBrokenLinks: number;
  articlesAffected: number;
  articles: BrokenLinkInfo[];
}

export const useBrokenLinksDetection = () => {
  return useQuery({
    queryKey: ['broken-links-detection'],
    queryFn: async (): Promise<BrokenLinksStats> => {
      console.log('Starting broken links detection...');

      // Fetch all published articles with internal_links
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, internal_links')
        .eq('status', 'published')
        .not('internal_links', 'is', null);

      if (error) {
        console.error('Error fetching articles:', error);
        throw error;
      }

      const brokenLinkArticles: BrokenLinkInfo[] = [];
      let totalBrokenLinks = 0;

      // Check each article for broken links
      for (const article of articles || []) {
        const internalLinks = article.internal_links as any[];
        if (!internalLinks || internalLinks.length === 0) continue;

        let brokenCount = 0;

        for (const link of internalLinks) {
          if (!link.url) continue;

          // Extract slug from URL
          const slug = link.url.replace('/blog/', '').replace(/^\//, '');

          // Check if this slug exists in the database
          const { count } = await supabase
            .from('blog_articles')
            .select('*', { count: 'exact', head: true })
            .eq('slug', slug);

          if (count === 0) {
            brokenCount++;
          }
        }

        if (brokenCount > 0) {
          brokenLinkArticles.push({
            articleId: article.id,
            articleSlug: article.slug,
            articleHeadline: article.headline,
            brokenLinksCount: brokenCount,
          });
          totalBrokenLinks += brokenCount;
        }
      }

      console.log(`Found ${totalBrokenLinks} broken links in ${brokenLinkArticles.length} articles`);

      return {
        totalBrokenLinks,
        articlesAffected: brokenLinkArticles.length,
        articles: brokenLinkArticles,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
};
