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

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('bulk_recitation_jobs')
      .insert({
        status: 'running',
        progress_current: 0,
        progress_total: 0,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    console.log(`🚀 Started bulk re-citation job ${job.id}`);

    // Start background processing (don't await)
    processArticlesInBackground(job.id, preview, language, category, batchSize);

    // Return immediately with job ID
    return new Response(
      JSON.stringify({ jobId: job.id, status: 'running' }),
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

async function processArticlesInBackground(
  jobId: string,
  preview: boolean,
  language: string | null,
  category: string | null,
  batchSize: number
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log(`📊 Processing job ${jobId} - Preview: ${preview}, Language: ${language}, Category: ${category}`);

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
      await supabase
        .from('bulk_recitation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_current: 0,
          progress_total: 0
        })
        .eq('id', jobId);
      return;
    }

    // Update job with total count
    await supabase
      .from('bulk_recitation_jobs')
      .update({ progress_total: articles.length })
      .eq('id', jobId);

    const results: ProcessingResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    let totalNewCitations = 0;

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
                  articleContent: article.detailed_content.substring(0, 2000),
                  articleLanguage: article.language,
                  verifyUrls: false,
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
              results.push({
                articleId: article.id,
                slug: article.slug,
                headline: article.headline,
                status: 'success',
                oldCitationsCount: oldCount,
                newCitationsCount: newCitations.length,
              });
              successCount++;
              totalNewCitations += newCitations.length;
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

            // Update article with new citations
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
            successCount++;
            totalNewCitations += newCitations.length;

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
            errorCount++;
          }
        })
      );

      // Update progress after each batch
      await supabase
        .from('bulk_recitation_jobs')
        .update({
          progress_current: Math.min(i + batchSize, articles.length),
          success_count: successCount,
          error_count: errorCount,
          total_new_citations: totalNewCitations
        })
        .eq('id', jobId);

      // Small delay between batches
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Mark job as completed
    await supabase
      .from('bulk_recitation_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_current: articles.length,
        success_count: successCount,
        error_count: errorCount,
        total_new_citations: totalNewCitations
      })
      .eq('id', jobId);

    console.log(`\n✅ Job ${jobId} complete - Success: ${successCount}, Errors: ${errorCount}, Citations: ${totalNewCitations}`);

  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    // Mark job as failed
    await supabase
      .from('bulk_recitation_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId);
  }
}
