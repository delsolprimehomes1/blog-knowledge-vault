import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  articleId: string;
  slug: string;
  headline: string;
  status: 'success' | 'error';
  oldCitationsCount: number;
  newCitationsCount: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { preview = false, language = null, category = null, batchSize = 5 } = await req.json();

    console.log(`🚀 Starting bulk re-citation - Preview: ${preview}, Language: ${language}, Category: ${category}`);

    // Query all published articles with external citations
    let query = supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, language, category, external_citations, funnel_stage')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (language) {
      query = query.eq('language', language);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`📊 Found ${articles?.length || 0} articles to process`);

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No articles found to process',
          results: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ProcessingResult[] = [];

    // Process in batches
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, Math.min(i + batchSize, articles.length));
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} articles)`);

      await Promise.all(
        batch.map(async (article) => {
          try {
            console.log(`\n🔄 Processing: ${article.headline} (${article.slug})`);

            const oldCitations = article.external_citations || [];
            const oldCount = Array.isArray(oldCitations) ? oldCitations.length : 0;

            console.log(`   Old citations count: ${oldCount}`);

            // Call find-better-citations to get new citations
            const { data: citationData, error: citationError } = await supabase.functions.invoke(
              'find-better-citations',
              {
                body: {
                  articleTopic: article.headline,
                  articleContent: article.detailed_content.substring(0, 2000), // First 2000 chars
                  articleLanguage: article.language,
                  verifyUrls: false, // Skip verification for speed
                }
              }
            );

            if (citationError || !citationData?.citations) {
              throw new Error(`Citation finding failed: ${citationError?.message || 'No citations returned'}`);
            }

            const newCitations = citationData.citations;
            console.log(`   Found ${newCitations.length} new citations from approved domains`);

            if (newCitations.length === 0) {
              throw new Error('No citations found from approved domains');
            }

            if (preview) {
              // Preview mode - don't save changes
              results.push({
                articleId: article.id,
                slug: article.slug,
                headline: article.headline,
                status: 'success',
                oldCitationsCount: oldCount,
                newCitationsCount: newCitations.length,
              });
              console.log(`   ✅ Preview complete`);
              return;
            }

            // Create backup revision
            const { error: revisionError } = await supabase
              .from('article_revisions')
              .insert({
                article_id: article.id,
                previous_content: article.detailed_content,
                previous_citations: oldCitations,
                revision_type: 'bulk_recitation',
                change_reason: 'Bulk re-citation to approved domains only',
                can_rollback: true,
              });

            if (revisionError) {
              console.warn(`   ⚠️ Failed to create backup: ${revisionError.message}`);
            }

            // Full Replace: Update article with new citations
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({
                external_citations: newCitations,
                updated_at: new Date().toISOString(),
              })
              .eq('id', article.id);

            if (updateError) {
              throw new Error(`Failed to update article: ${updateError.message}`);
            }

            // Update citation tracking
            await supabase
              .from('citation_usage_tracking')
              .delete()
              .eq('article_id', article.id);

            if (newCitations.length > 0) {
              const trackingRecords = newCitations.map((citation: any, index: number) => ({
                article_id: article.id,
                citation_url: citation.url,
                citation_source: citation.source,
                anchor_text: citation.text || citation.description?.substring(0, 100),
                position_in_article: index + 1,
              }));

              await supabase
                .from('citation_usage_tracking')
                .insert(trackingRecords);
            }

            results.push({
              articleId: article.id,
              slug: article.slug,
              headline: article.headline,
              status: 'success',
              oldCitationsCount: oldCount,
              newCitationsCount: newCitations.length,
            });

            console.log(`   ✅ Successfully replaced citations`);

          } catch (error) {
            console.error(`   ❌ Error processing article ${article.slug}:`, error);
            results.push({
              articleId: article.id,
              slug: article.slug,
              headline: article.headline,
              status: 'error',
              oldCitationsCount: 0,
              newCitationsCount: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const totalOldCitations = results.reduce((sum, r) => sum + r.oldCitationsCount, 0);
    const totalNewCitations = results.reduce((sum, r) => sum + r.newCitationsCount, 0);

    console.log(`\n🎉 Bulk re-citation complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Citations replaced: ${totalOldCitations} → ${totalNewCitations}`);

    return new Response(
      JSON.stringify({
        success: true,
        preview,
        summary: {
          totalArticles: articles.length,
          successCount,
          errorCount,
          totalOldCitations,
          totalNewCitations,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk re-citation error:', error);
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
