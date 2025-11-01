import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function findParagraphIndex(content: string, citationUrl: string): number | null {
  // Extract all <p> tags from HTML content
  const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gs) || [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].includes(citationUrl)) {
      return i;
    }
  }
  
  return null;
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

    console.log('Starting citation paragraph tracking backfill...');

    // Fetch all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, external_citations')
      .eq('status', 'published');

    if (articlesError) throw articlesError;

    let totalUpdated = 0;
    let totalProcessed = 0;
    let errors = 0;

    for (const article of articles || []) {
      console.log(`Processing article: ${article.slug}`);
      totalProcessed++;

      for (const citation of article.external_citations || []) {
        try {
          // Find paragraph index for this citation
          const paragraphIndex = findParagraphIndex(article.detailed_content, citation.url);

          if (paragraphIndex !== null) {
            // Update citation_usage_tracking with paragraph context
            const { error: updateError } = await supabase
              .from('citation_usage_tracking')
              .update({ 
                context_paragraph_index: paragraphIndex,
                updated_at: new Date().toISOString()
              })
              .eq('article_id', article.id)
              .eq('citation_url', citation.url);

            if (updateError) {
              console.error(`Error updating citation for ${article.slug}:`, updateError);
              errors++;
            } else {
              totalUpdated++;
              console.log(`✓ Updated paragraph index ${paragraphIndex} for ${citation.source}`);
            }
          } else {
            // Citation URL not found in content - log warning
            console.warn(`⚠️ Citation URL not found in content: ${citation.source} in ${article.slug}`);
            
            // Still try to update with null to mark as checked
            await supabase
              .from('citation_usage_tracking')
              .update({ 
                context_paragraph_index: null,
                updated_at: new Date().toISOString()
              })
              .eq('article_id', article.id)
              .eq('citation_url', citation.url);
          }
        } catch (error) {
          console.error(`Error processing citation ${citation.source}:`, error);
          errors++;
        }
      }
    }

    const summary = {
      totalArticles: articles?.length || 0,
      articlesProcessed: totalProcessed,
      citationsUpdated: totalUpdated,
      errors,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    console.log('Backfill complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message, status: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
