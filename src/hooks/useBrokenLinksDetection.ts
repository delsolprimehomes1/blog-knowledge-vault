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
      console.log('Starting optimized broken links detection...');

      // STEP 1: Fetch all valid slugs (1 query)
      const { data: allArticles, error: slugsError } = await supabase
        .from('blog_articles')
        .select('slug')
        .eq('status', 'published');

      if (slugsError) {
        console.error('Error fetching valid slugs:', slugsError);
        throw slugsError;
      }

      // Create a Set for O(1) lookup performance
      const validSlugs = new Set(allArticles?.map(a => a.slug) || []);
      console.log(`Loaded ${validSlugs.size} valid slugs`);

      // STEP 2: Fetch all articles with internal_links (1 query)
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, internal_links')
        .eq('status', 'published')
        .not('internal_links', 'is', null);

      if (error) {
        console.error('Error fetching articles:', error);
        throw error;
      }

      // STEP 3: Check for broken links in memory (JavaScript, no queries)
      const brokenLinkArticles: BrokenLinkInfo[] = [];
      let totalBrokenLinks = 0;

      for (const article of articles || []) {
        const internalLinks = article.internal_links as any[];
        if (!internalLinks || internalLinks.length === 0) continue;

        let brokenCount = 0;
        const brokenLinksInArticle: string[] = [];

        for (const link of internalLinks) {
          if (!link.url) continue;

          // Extract slug from URL
          const slug = link.url.replace('/blog/', '').replace(/^\//, '');

          // Check against in-memory Set (O(1) operation)
          if (!validSlugs.has(slug)) {
            brokenCount++;
            brokenLinksInArticle.push(slug);
          }
        }

        if (brokenCount > 0) {
          console.log(`Article "${article.headline}" has ${brokenCount} broken links:`, brokenLinksInArticle);
          brokenLinkArticles.push({
            articleId: article.id,
            articleSlug: article.slug,
            articleHeadline: article.headline,
            brokenLinksCount: brokenCount,
          });
          totalBrokenLinks += brokenCount;
        }
      }

      console.log(`✅ Detection complete: ${totalBrokenLinks} broken links in ${brokenLinkArticles.length} articles`);

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
