import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RemovalResult {
  articleId: string;
  articleSlug: string;
  removedCount: number;
  remainingCount: number;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting broken links removal process...');

    // Step 1: Fetch ALL valid slugs for in-memory lookup
    console.log('Fetching all valid slugs...');
    const { data: allArticles, error: slugsError } = await supabase
      .from('blog_articles')
      .select('slug')
      .eq('status', 'published');

    if (slugsError) {
      console.error('Error fetching valid slugs:', slugsError);
      throw slugsError;
    }

    const validSlugs = new Set(allArticles?.map(a => a.slug) || []);
    console.log(`Loaded ${validSlugs.size} valid slugs into memory`);

    // Step 2: Fetch all published articles with internal_links
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, internal_links')
      .eq('status', 'published')
      .not('internal_links', 'is', null);

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      throw fetchError;
    }

    console.log(`Processing ${articles?.length || 0} articles...`);

    // Step 3: Remove broken links and update articles
    const results: RemovalResult[] = [];
    let totalRemoved = 0;
    let articlesUpdated = 0;

    for (const article of articles || []) {
      try {
        const internalLinks = Array.isArray(article.internal_links) ? article.internal_links : [];
        const originalCount = internalLinks.length;

        // Filter out broken links
        const validLinks = internalLinks.filter((link: any) => {
          if (!link.url) return false;
          const slug = link.url.replace('/blog/', '').replace(/^\//, '');
          return validSlugs.has(slug);
        });

        const removedCount = originalCount - validLinks.length;

        // Only update if we removed any links
        if (removedCount > 0) {
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ 
              internal_links: validLinks,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);

          if (updateError) {
            console.error(`Error updating article ${article.slug}:`, updateError);
            results.push({
              articleId: article.id,
              articleSlug: article.slug,
              removedCount,
              remainingCount: validLinks.length,
              success: false,
              error: updateError.message
            });
          } else {
            totalRemoved += removedCount;
            articlesUpdated++;
            results.push({
              articleId: article.id,
              articleSlug: article.slug,
              removedCount,
              remainingCount: validLinks.length,
              success: true
            });
            console.log(`✓ ${article.slug}: Removed ${removedCount} broken links, ${validLinks.length} valid links remaining`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing article ${article.slug}:`, error);
        results.push({
          articleId: article.id,
          articleSlug: article.slug,
          removedCount: 0,
          remainingCount: 0,
          success: false,
          error: errorMessage
        });
      }
    }

    console.log(`Removal complete: ${totalRemoved} broken links removed from ${articlesUpdated} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        totalArticlesProcessed: articles?.length || 0,
        articlesUpdated,
        totalLinksRemoved: totalRemoved,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in remove-broken-internal-links:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
