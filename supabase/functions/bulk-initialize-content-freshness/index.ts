import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting content freshness initialization...');

    // Step 1: Get all published articles without date_modified
    const { data: articlesNeedingInit, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, date_published, slug')
      .eq('status', 'published')
      .is('date_modified', null);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`Found ${articlesNeedingInit?.length || 0} articles needing date_modified initialization`);

    let updatedCount = 0;
    let errorCount = 0;

    // Step 2: Initialize date_modified for articles that don't have it
    if (articlesNeedingInit && articlesNeedingInit.length > 0) {
      for (const article of articlesNeedingInit) {
        try {
          const initDate = article.date_published || new Date().toISOString();
          
          // Update date_modified
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ date_modified: initDate })
            .eq('id', article.id);

          if (updateError) {
            console.error(`Failed to update article ${article.id}:`, updateError);
            errorCount++;
            continue;
          }

          // Create initial content_updates entry
          const { error: insertError } = await supabase
            .from('content_updates')
            .insert({
              article_id: article.id,
              update_type: 'bulk_refresh',
              updated_fields: ['date_modified'],
              new_date_modified: initDate,
              update_notes: 'Initial content freshness tracking baseline'
            });

          if (insertError) {
            console.error(`Failed to create content_update for article ${article.id}:`, insertError);
            errorCount++;
            continue;
          }

          updatedCount++;
          console.log(`✓ Initialized article: ${article.headline}`);
        } catch (error) {
          console.error(`Error processing article ${article.id}:`, error);
          errorCount++;
        }
      }
    }

    // Step 3: Get all published articles with date_modified but no content_updates entries
    const { data: articlesNeedingTracking, error: trackingFetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, date_modified, slug')
      .eq('status', 'published')
      .not('date_modified', 'is', null);

    if (trackingFetchError) {
      throw new Error(`Failed to fetch articles for tracking: ${trackingFetchError.message}`);
    }

    let trackingCount = 0;

    if (articlesNeedingTracking && articlesNeedingTracking.length > 0) {
      for (const article of articlesNeedingTracking) {
        // Check if article already has content_updates entries
        const { data: existingUpdates, error: checkError } = await supabase
          .from('content_updates')
          .select('id')
          .eq('article_id', article.id)
          .limit(1);

        if (checkError) {
          console.error(`Failed to check existing updates for article ${article.id}:`, checkError);
          continue;
        }

        // Only create entry if none exists
        if (!existingUpdates || existingUpdates.length === 0) {
          const { error: insertError } = await supabase
            .from('content_updates')
            .insert({
              article_id: article.id,
              update_type: 'bulk_refresh',
              updated_fields: ['date_modified'],
              new_date_modified: article.date_modified,
              update_notes: 'Initial content freshness tracking baseline'
            });

          if (insertError) {
            console.error(`Failed to create content_update for article ${article.id}:`, insertError);
            errorCount++;
            continue;
          }

          trackingCount++;
          console.log(`✓ Created tracking entry for: ${article.headline}`);
        }
      }
    }

    console.log('Content freshness initialization complete');
    console.log(`- Articles with date_modified initialized: ${updatedCount}`);
    console.log(`- Articles with tracking entries created: ${trackingCount}`);
    console.log(`- Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        initialized: updatedCount,
        tracked: trackingCount,
        errors: errorCount,
        message: `Successfully initialized ${updatedCount} articles and created ${trackingCount} tracking entries`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in bulk-initialize-content-freshness:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
