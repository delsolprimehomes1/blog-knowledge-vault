import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillResult {
  slug: string;
  oldCanonical: string | null;
  newCanonical: string;
  status: 'success' | 'skipped' | 'failed';
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

    const { dryRun = false, articleSlugs = null } = await req.json();
    const baseUrl = 'https://delsolprimehomes.com';

    console.log(`🔗 Starting canonical URL backfill (dryRun: ${dryRun})`);

    // Fetch articles
    let query = supabase
      .from('blog_articles')
      .select('id, slug, canonical_url, status')
      .eq('status', 'published');

    if (articleSlugs && Array.isArray(articleSlugs)) {
      query = query.in('slug', articleSlugs);
    }

    const { data: articles, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No articles found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`📊 Found ${articles.length} articles to process`);

    const results: BackfillResult[] = [];
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (article) => {
        const canonicalUrl = `${baseUrl}/blog/${article.slug}`;
        
        // Skip if already set correctly
        if (article.canonical_url === canonicalUrl) {
          results.push({
            slug: article.slug,
            oldCanonical: article.canonical_url,
            newCanonical: canonicalUrl,
            status: 'skipped'
          });
          skipped++;
          return;
        }

        if (dryRun) {
          results.push({
            slug: article.slug,
            oldCanonical: article.canonical_url,
            newCanonical: canonicalUrl,
            status: 'success'
          });
          updated++;
          return;
        }

        // Update canonical URL
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ canonical_url: canonicalUrl })
          .eq('id', article.id);

        if (updateError) {
          console.error(`❌ Failed to update ${article.slug}:`, updateError.message);
          results.push({
            slug: article.slug,
            oldCanonical: article.canonical_url,
            newCanonical: canonicalUrl,
            status: 'failed',
            error: updateError.message
          });
          failed++;
        } else {
          console.log(`✅ Updated ${article.slug}`);
          results.push({
            slug: article.slug,
            oldCanonical: article.canonical_url,
            newCanonical: canonicalUrl,
            status: 'success'
          });
          updated++;
        }
      }));

      console.log(`📦 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);
    }

    const response = {
      success: true,
      dryRun,
      totalArticles: articles.length,
      updated,
      skipped,
      failed,
      results: results.slice(0, 10), // Sample results
      message: dryRun 
        ? `✅ Dry run complete: ${updated} articles would be updated, ${skipped} already correct`
        : `✅ Backfill complete: ${updated} updated, ${skipped} skipped, ${failed} failed`
    };

    console.log(response.message);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
