import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrokenLinkResult {
  articleId: string;
  articleSlug: string;
  articleHeadline: string;
  brokenLinks: Array<{
    url: string;
    slug: string;
    title?: string;
  }>;
}

interface FixResult {
  articleId: string;
  articleSlug: string;
  articleHeadline: string;
  linksFixed: number;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting broken internal links fix process...');

    // Step 1: Fetch all published articles with internal_links
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, internal_links, language, funnel_stage, detailed_content')
      .eq('status', 'published')
      .not('internal_links', 'is', null);

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      throw fetchError;
    }

    console.log(`Fetched ${articles?.length || 0} articles to check`);

    // Step 2: Validate internal links and identify broken ones
    const articlesWithBrokenLinks: BrokenLinkResult[] = [];
    
    for (const article of articles || []) {
      const internalLinks = article.internal_links as any[];
      if (!internalLinks || internalLinks.length === 0) continue;

      const brokenLinks: BrokenLinkResult['brokenLinks'] = [];

      for (const link of internalLinks) {
        if (!link.url) continue;

        // Extract slug from URL (e.g., /blog/some-slug -> some-slug)
        const slug = link.url.replace('/blog/', '').replace(/^\//, '');

        // Check if this slug exists in the database
        const { count } = await supabase
          .from('blog_articles')
          .select('*', { count: 'exact', head: true })
          .eq('slug', slug);

        if (count === 0) {
          brokenLinks.push({
            url: link.url,
            slug: slug,
            title: link.title || link.headline,
          });
        }
      }

      if (brokenLinks.length > 0) {
        articlesWithBrokenLinks.push({
          articleId: article.id,
          articleSlug: article.slug,
          articleHeadline: article.headline,
          brokenLinks,
        });
      }
    }

    console.log(`Found ${articlesWithBrokenLinks.length} articles with broken links`);
    const totalBrokenLinks = articlesWithBrokenLinks.reduce((sum, a) => sum + a.brokenLinks.length, 0);
    console.log(`Total broken links: ${totalBrokenLinks}`);

    // Step 3: Fix articles with broken links
    const fixResults: FixResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < articlesWithBrokenLinks.length; i += batchSize) {
      const batch = articlesWithBrokenLinks.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(articlesWithBrokenLinks.length / batchSize)}`);

      const batchPromises = batch.map(async (articleWithBroken) => {
        try {
          // Get the full article data
          const { data: fullArticle } = await supabase
            .from('blog_articles')
            .select('*')
            .eq('id', articleWithBroken.articleId)
            .single();

          if (!fullArticle) {
            throw new Error('Article not found');
          }

          // Call find-internal-links to regenerate proper links
          console.log(`Regenerating links for article: ${articleWithBroken.articleSlug}`);
          
          const { data: newLinksData, error: linksError } = await supabase.functions.invoke(
            'find-internal-links',
            {
              body: {
                content: fullArticle.detailed_content,
                headline: fullArticle.headline,
                currentArticleId: fullArticle.id,
                language: fullArticle.language,
                funnelStage: fullArticle.funnel_stage,
              },
            }
          );

          if (linksError) {
            console.error(`Error finding links for ${articleWithBroken.articleSlug}:`, linksError);
            throw linksError;
          }

          const newLinks = newLinksData?.links || [];
          
          if (newLinks.length === 0) {
            console.warn(`No new links generated for ${articleWithBroken.articleSlug}`);
            throw new Error('No new links generated');
          }

          // Validate new links - check that slugs exist and are complete
          let validLinks = 0;
          for (const link of newLinks) {
            const slug = link.url.replace('/blog/', '').replace(/^\//, '');
            const { count } = await supabase
              .from('blog_articles')
              .select('*', { count: 'exact', head: true })
              .eq('slug', slug);
            
            if (count && count > 0 && slug.length > 20) {
              validLinks++;
            }
          }

          console.log(`Generated ${newLinks.length} links, ${validLinks} are valid for ${articleWithBroken.articleSlug}`);

          // Update the article with new internal_links
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ internal_links: newLinks })
            .eq('id', articleWithBroken.articleId);

          if (updateError) {
            console.error(`Error updating article ${articleWithBroken.articleSlug}:`, updateError);
            throw updateError;
          }

          successCount++;
          return {
            articleId: articleWithBroken.articleId,
            articleSlug: articleWithBroken.articleSlug,
            articleHeadline: articleWithBroken.articleHeadline,
            linksFixed: articleWithBroken.brokenLinks.length,
            success: true,
          };
        } catch (error) {
          errorCount++;
          console.error(`Failed to fix article ${articleWithBroken.articleSlug}:`, error);
          return {
            articleId: articleWithBroken.articleId,
            articleSlug: articleWithBroken.articleSlug,
            articleHeadline: articleWithBroken.articleHeadline,
            linksFixed: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      fixResults.push(...batchResults);

      // Wait 2 seconds between batches to avoid rate limits
      if (i + batchSize < articlesWithBrokenLinks.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Calculate final statistics
    const totalLinksFixed = fixResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.linksFixed, 0);

    const report = {
      success: true,
      total_checked: articles?.length || 0,
      articles_with_broken_links: articlesWithBrokenLinks.length,
      total_broken_links_found: totalBrokenLinks,
      articles_fixed: successCount,
      articles_failed: errorCount,
      links_fixed: totalLinksFixed,
      results: fixResults,
      errors: fixResults.filter(r => !r.success).map(r => ({
        articleSlug: r.articleSlug,
        error: r.error,
      })),
    };

    console.log('Fix process completed:', report);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fix-broken-internal-links function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
