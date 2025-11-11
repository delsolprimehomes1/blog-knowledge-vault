import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      try {
        console.log('Starting optimized broken links detection...');

        // STEP 1: Fetch all valid slugs (1 query)
        const { data: allArticles, error: slugsError } = await supabase
          .from('blog_articles')
          .select('slug')
          .eq('status', 'published');

        if (slugsError) {
          console.error('❌ Error fetching valid slugs:', slugsError);
          toast.error('Failed to fetch article slugs', {
            description: slugsError.message || 'Could not load valid article slugs'
          });
          throw new Error(`Failed to fetch slugs: ${slugsError.message}`);
        }

        if (!allArticles || allArticles.length === 0) {
          console.warn('⚠️ No published articles found');
          toast.warning('No published articles found', {
            description: 'There are no published articles to check for broken links'
          });
          return {
            totalBrokenLinks: 0,
            articlesAffected: 0,
            articles: [],
          };
        }

        // Create a Set for O(1) lookup performance
        const validSlugs = new Set(allArticles.map(a => a.slug));
        console.log(`✓ Loaded ${validSlugs.size} valid slugs`);

        // STEP 2: Fetch all articles with internal_links (1 query)
        const { data: articles, error } = await supabase
          .from('blog_articles')
          .select('id, slug, headline, internal_links')
          .eq('status', 'published')
          .not('internal_links', 'is', null);

        if (error) {
          console.error('❌ Error fetching articles with internal links:', error);
          toast.error('Failed to fetch articles', {
            description: error.message || 'Could not load articles with internal links'
          });
          throw new Error(`Failed to fetch articles: ${error.message}`);
        }

        if (!articles || articles.length === 0) {
          console.log('ℹ️ No articles with internal links found');
          return {
            totalBrokenLinks: 0,
            articlesAffected: 0,
            articles: [],
          };
        }

        console.log(`✓ Checking internal links in ${articles.length} articles...`);

        // STEP 3: Check for broken links in memory (JavaScript, no queries)
        const brokenLinkArticles: BrokenLinkInfo[] = [];
        let totalBrokenLinks = 0;

        for (const article of articles) {
          try {
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
              console.log(`  └─ "${article.headline}": ${brokenCount} broken links - [${brokenLinksInArticle.join(', ')}]`);
              brokenLinkArticles.push({
                articleId: article.id,
                articleSlug: article.slug,
                articleHeadline: article.headline,
                brokenLinksCount: brokenCount,
              });
              totalBrokenLinks += brokenCount;
            }
          } catch (articleError) {
            console.error(`⚠️ Error processing article "${article.headline}":`, articleError);
            // Continue processing other articles even if one fails
          }
        }

        console.log(`✅ Detection complete: ${totalBrokenLinks} broken links in ${brokenLinkArticles.length} articles`);

        if (totalBrokenLinks > 0) {
          toast.info(`Found ${totalBrokenLinks} broken links`, {
            description: `${brokenLinkArticles.length} articles need attention`
          });
        }

        return {
          totalBrokenLinks,
          articlesAffected: brokenLinkArticles.length,
          articles: brokenLinkArticles,
        };
      } catch (error) {
        console.error('❌ Fatal error in broken links detection:', error);
        toast.error('Broken links detection failed', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
        
        // Return safe defaults instead of crashing the UI
        return {
          totalBrokenLinks: 0,
          articlesAffected: 0,
          articles: [],
        };
      }
    },
    staleTime: 1000 * 30, // Cache for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
