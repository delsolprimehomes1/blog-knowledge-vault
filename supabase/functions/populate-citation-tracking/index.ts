import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting citation tracking population...');

    // Fetch all published articles with external_citations
    const { data: articles, error: fetchError } = await supabaseClient
      .from('blog_articles')
      .select('id, slug, external_citations')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      throw fetchError;
    }

    console.log(`📚 Found ${articles?.length || 0} articles with citations`);

    let totalTracked = 0;
    let articlesProcessed = 0;

    for (const article of articles || []) {
      try {
        const citations = article.external_citations as any[];
        
        if (!citations || citations.length === 0) {
          continue;
        }

        console.log(`📄 Processing article: ${article.slug} (${citations.length} citations)`);

        // Delete existing tracking records for this article
        const { error: deleteError } = await supabaseClient
          .from('citation_usage_tracking')
          .delete()
          .eq('article_id', article.id);

        if (deleteError) {
          console.error(`Error deleting old tracking for ${article.slug}:`, deleteError);
          continue;
        }

        // Insert new tracking records
        const trackingRecords = citations.map((citation, index) => ({
          article_id: article.id,
          citation_url: citation.url,
          citation_source: citation.source || null,
          anchor_text: citation.text || null,
          position_in_article: index + 1,
          is_active: true
        }));

        const { error: insertError } = await supabaseClient
          .from('citation_usage_tracking')
          .insert(trackingRecords);

        if (insertError) {
          console.error(`Error inserting tracking for ${article.slug}:`, insertError);
          continue;
        }

        totalTracked += citations.length;
        articlesProcessed++;
        console.log(`✅ Tracked ${citations.length} citations for ${article.slug}`);

      } catch (articleError) {
        console.error(`Error processing article ${article.slug}:`, articleError);
      }
    }

    console.log(`🎉 Population complete: ${totalTracked} citations tracked across ${articlesProcessed} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        articlesProcessed,
        citationsTracked: totalTracked,
        message: `Successfully populated citation tracking for ${articlesProcessed} articles with ${totalTracked} citations`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in populate-citation-tracking:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
