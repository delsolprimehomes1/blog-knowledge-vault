import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting citation generation for articles with missing citations...');

    // Find all published articles without citations
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, language, funnel_stage')
      .eq('status', 'published')
      .or('external_citations.is.null,external_citations.eq.[]');

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      throw fetchError;
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No articles found with missing citations',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${articles.length} articles without citations`);

    const results = {
      total: articles.length,
      successful: 0,
      failed: 0,
      details: [] as any[]
    };

    // Process each article
    for (const article of articles) {
      console.log(`Processing article: ${article.slug}`);

      try {
        // Create revision backup before changes
        const { error: revisionError } = await supabase
          .from('article_revisions')
          .insert({
            article_id: article.id,
            revision_type: 'citation_generation',
            previous_content: article.detailed_content,
            changes_summary: 'Backup before generating citations'
          });

        if (revisionError) {
          console.error(`Failed to create revision for ${article.slug}:`, revisionError);
        }

        // Call find-external-links function
        const { data: citationsData, error: citationsError } = await supabase.functions.invoke(
          'find-external-links',
          {
            body: {
              content: article.detailed_content,
              headline: article.headline,
              language: article.language || 'en',
              funnelStage: article.funnel_stage || 'TOFU',
              requireGovernmentSource: false
            }
          }
        );

        if (citationsError) {
          console.error(`Citation generation failed for ${article.slug}:`, citationsError);
          results.failed++;
          results.details.push({
            slug: article.slug,
            status: 'failed',
            error: citationsError.message
          });
          continue;
        }

        const citations = citationsData?.citations || [];
        
        if (citations.length === 0) {
          console.warn(`No citations found for ${article.slug}`);
          results.failed++;
          results.details.push({
            slug: article.slug,
            status: 'failed',
            error: 'No citations generated'
          });
          continue;
        }

        // Format citations for storage
        const formattedCitations = citations.map((citation: any) => ({
          text: citation.anchorText || citation.source || citation.source_name,
          url: citation.url,
          source: citation.source || citation.source_name,
          sourceType: citation.sourceType,
          authorityScore: citation.authorityScore || 50,
          verificationDate: new Date().toISOString(),
          year: citation.year || new Date().getFullYear()
        }));

        // Update article with new citations
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ 
            external_citations: formattedCitations,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`Failed to update article ${article.slug}:`, updateError);
          results.failed++;
          results.details.push({
            slug: article.slug,
            status: 'failed',
            error: updateError.message
          });
          continue;
        }

        console.log(`✅ Successfully generated ${citations.length} citations for ${article.slug}`);
        results.successful++;
        results.details.push({
          slug: article.slug,
          status: 'success',
          citationsGenerated: citations.length
        });

      } catch (articleError) {
        console.error(`Error processing article ${article.slug}:`, articleError);
        results.failed++;
        results.details.push({
          slug: article.slug,
          status: 'failed',
          error: articleError instanceof Error ? articleError.message : 'Unknown error'
        });
      }
    }

    console.log('Citation generation complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} articles: ${results.successful} successful, ${results.failed} failed`,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-missing-citations:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
