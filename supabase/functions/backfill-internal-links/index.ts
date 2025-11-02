import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔗 Starting internal links backfill...');

    // Fetch all published articles missing internal links
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, language, funnel_stage')
      .eq('status', 'published')
      .or('internal_links.is.null,internal_links.eq.[]');

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      console.log('✅ No articles need internal links backfill');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All articles already have internal links',
          total_articles: 0,
          success_count: 0,
          error_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${articles.length} articles needing internal links`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < articles.length; i += 10) {
      const batch = articles.slice(i, i + 10);
      console.log(`\n🔄 Processing batch ${Math.floor(i / 10) + 1}/${Math.ceil(articles.length / 10)} (${batch.length} articles)`);

      for (const article of batch) {
        try {
          console.log(`  📝 Finding links for: "${article.headline}" (${article.language})`);

          // Call find-internal-links edge function
          const { data: linksData, error: linksError } = await supabase.functions.invoke('find-internal-links', {
            body: {
              content: article.detailed_content || '',
              headline: article.headline,
              currentArticleId: article.id,
              language: article.language,
              funnelStage: article.funnel_stage
            }
          });

          if (linksError) {
            throw new Error(`find-internal-links failed: ${linksError.message}`);
          }

          if (linksData?.links && linksData.links.length > 0) {
            // Convert suggested links to internal_links format
            const internalLinks = linksData.links.map((link: any) => ({
              text: link.text || link.anchorText,
              url: link.url,
              title: link.title || link.targetHeadline
            }));

            // Update article in database
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ internal_links: internalLinks })
              .eq('id', article.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            console.log(`  ✅ Added ${internalLinks.length} internal links to "${article.headline}"`);
            successCount++;
          } else {
            console.log(`  ⚠️ No internal links found for "${article.headline}"`);
            successCount++; // Count as success even if no links found
          }
        } catch (error) {
          console.error(`  ❌ Error processing "${article.headline}":`, error);
          errors.push(`${article.slug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }

      // Wait 2 seconds between batches to avoid rate limits
      if (i + 10 < articles.length) {
        console.log(`  ⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`   Total articles: ${articles.length}`);
    console.log(`   Successfully processed: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_articles: articles.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errorCount > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Backfill internal links function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
