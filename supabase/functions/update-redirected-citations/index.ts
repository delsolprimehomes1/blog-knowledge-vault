import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting redirected citations update...');

    // Fetch all redirected citations with their redirect URLs
    const { data: redirectedCitations, error: fetchError } = await supabase
      .from('external_citation_health')
      .select('url, redirect_url, source_name')
      .eq('status', 'redirected')
      .not('redirect_url', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch redirected citations: ${fetchError.message}`);
    }

    if (!redirectedCitations || redirectedCitations.length === 0) {
      console.log('✅ No redirected citations to update');
      return new Response(JSON.stringify({
        success: true,
        message: 'No redirected citations found',
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${redirectedCitations.length} redirected citations to update`);

    let updatedArticles = 0;
    let updatedCitations = 0;
    const results = [];

    for (const citation of redirectedCitations) {
      const oldUrl = citation.url;
      const newUrl = citation.redirect_url;

      console.log(`\n🔗 Processing: ${oldUrl} -> ${newUrl}`);

      // Find all articles using this citation
      const { data: articles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, headline, external_citations')
        .eq('status', 'published')
        .not('external_citations', 'is', null);

      if (articlesError) {
        console.error(`Error fetching articles: ${articlesError.message}`);
        continue;
      }

      // Filter articles that actually contain this URL
      const affectedArticles = articles?.filter(article => {
        const citations = article.external_citations as any[];
        return citations?.some(c => c.url === oldUrl);
      }) || [];

      if (affectedArticles.length === 0) {
        console.log(`  ⏭️  No articles using this citation (already fixed)`);
      } else {
        console.log(`  📄 Found ${affectedArticles.length} articles using this citation`);

        // Update each article
        for (const article of affectedArticles) {
          try {
            const externalCitations = article.external_citations as any[];
            const updatedCitations = externalCitations.map(c => 
              c.url === oldUrl 
                ? { ...c, url: newUrl }
                : c
            );

            // Update article
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                external_citations: updatedCitations,
                updated_at: new Date().toISOString()
              })
              .eq('id', article.id);

            if (updateError) {
              console.error(`  ❌ Failed to update article ${article.id}: ${updateError.message}`);
              continue;
            }

            updatedArticles++;
            console.log(`  ✅ Updated: ${article.headline}`);

            results.push({
              articleId: article.id,
              articleTitle: article.headline,
              oldUrl,
              newUrl
            });

          } catch (error) {
            console.error(`  ❌ Error updating article ${article.id}:`, error);
          }
        }

        // Update citation_usage_tracking: mark old as inactive, create new
        const { data: trackingRecords } = await supabase
          .from('citation_usage_tracking')
          .select('*')
          .eq('citation_url', oldUrl)
          .eq('is_active', true);

        if (trackingRecords && trackingRecords.length > 0) {
          // Deactivate old tracking records
          await supabase
            .from('citation_usage_tracking')
            .update({ is_active: false })
            .eq('citation_url', oldUrl);

          // Create new tracking records for redirect URL
          const newTrackingRecords = trackingRecords.map(record => ({
            article_id: record.article_id,
            citation_url: newUrl,
            citation_source: citation.source_name || record.citation_source,
            anchor_text: record.anchor_text,
            position_in_article: record.position_in_article,
            is_active: true
          }));

          await supabase
            .from('citation_usage_tracking')
            .insert(newTrackingRecords);
        }
      }

      // ALWAYS update external_citation_health - delete old record and create new one
      // This ensures the health table reflects the correct state even if no articles were found
      console.log(`  🔄 Updating health table: removing ${oldUrl}, adding ${newUrl}`);
      
      // Delete the old URL record
      await supabase
        .from('external_citation_health')
        .delete()
        .eq('url', oldUrl);

      // Insert new record with the redirect URL (copy all fields from old record)
      await supabase
        .from('external_citation_health')
        .insert({
          url: newUrl,
          source_name: citation.source_name,
          status: 'active',
          redirect_url: null,
          is_government_source: false,
          updated_at: new Date().toISOString()
        });

      updatedCitations++;
      console.log(`  ✅ Health table updated`);
    }

    console.log(`\n✅ Update complete:`);
    console.log(`  - Citations updated: ${updatedCitations}`);
    console.log(`  - Articles updated: ${updatedArticles}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully updated ${updatedCitations} redirected citations in ${updatedArticles} articles`,
      updatedCitations,
      updatedArticles,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
