import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrokenLink {
  href: string;
  anchorText: string;
  occurrences: number;
}

interface ArticleWithBrokenLinks {
  articleId: string;
  slug: string;
  headline: string;
  language: string;
  brokenLinks: BrokenLink[];
  totalBrokenLinks: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting internal link validation scan...');

    // Fetch all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, language, detailed_content, status')
      .eq('status', 'published');

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    console.log(`Scanning ${articles.length} published articles...`);

    // Get list of valid slugs for validation
    const validSlugs = new Set(articles.map(a => a.slug));

    // Define valid static routes
    const validStaticRoutes = new Set([
      '/',
      '/blog',
      '/about',
      '/privacy-policy',
      '/terms-of-service',
      '/sitemap',
      '/admin',
      '/admin/dashboard',
      '/admin/articles',
      '/admin/authors',
      '/admin/settings',
    ]);

    const articlesWithBrokenLinks: ArticleWithBrokenLinks[] = [];
    const brokenLinkPatterns: Map<string, number> = new Map();

    // Scan each article
    for (const article of articles) {
      const brokenLinksInArticle: Map<string, BrokenLink> = new Map();

      // Extract all internal links from content
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let match;

      while ((match = linkRegex.exec(article.detailed_content)) !== null) {
        const href = match[1];
        const anchorText = match[2].replace(/<[^>]*>/g, ''); // Strip HTML tags from anchor text

        // Only check internal links (starting with /)
        if (!href.startsWith('/') || href.startsWith('//')) {
          continue;
        }

        // Remove query params and hash for validation
        const cleanPath = href.split('?')[0].split('#')[0];

        // Check if link is valid
        let isValid = false;

        // Check static routes
        if (validStaticRoutes.has(cleanPath)) {
          isValid = true;
        }

        // Check blog article routes (/blog/:slug)
        if (cleanPath.startsWith('/blog/')) {
          const slug = cleanPath.replace('/blog/', '');
          if (validSlugs.has(slug)) {
            isValid = true;
          }
        }

        // If not valid, record it
        if (!isValid) {
          // Track in article
          if (brokenLinksInArticle.has(href)) {
            brokenLinksInArticle.get(href)!.occurrences++;
          } else {
            brokenLinksInArticle.set(href, {
              href,
              anchorText,
              occurrences: 1,
            });
          }

          // Track globally
          brokenLinkPatterns.set(href, (brokenLinkPatterns.get(href) || 0) + 1);
        }
      }

      // If article has broken links, add to results
      if (brokenLinksInArticle.size > 0) {
        const brokenLinks = Array.from(brokenLinksInArticle.values());
        articlesWithBrokenLinks.push({
          articleId: article.id,
          slug: article.slug,
          headline: article.headline,
          language: article.language,
          brokenLinks,
          totalBrokenLinks: brokenLinks.reduce((sum, link) => sum + link.occurrences, 0),
        });
      }
    }

    // Sort by most broken links
    articlesWithBrokenLinks.sort((a, b) => b.totalBrokenLinks - a.totalBrokenLinks);

    // Convert pattern map to sorted array
    const topBrokenPatterns = Array.from(brokenLinkPatterns.entries())
      .map(([href, count]) => ({ href, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 most common broken links

    const summary = {
      totalArticlesScanned: articles.length,
      articlesWithBrokenLinks: articlesWithBrokenLinks.length,
      totalBrokenLinkOccurrences: Array.from(brokenLinkPatterns.values()).reduce((sum, count) => sum + count, 0),
      uniqueBrokenLinkPatterns: brokenLinkPatterns.size,
    };

    console.log('Scan complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        topBrokenPatterns,
        articlesWithBrokenLinks,
        scannedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-article-links:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
