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

    console.log('🔄 Starting batch fix for broken citations...');

    // Fetch all broken/unreachable citations
    const { data: brokenCitations, error: fetchError } = await supabaseClient
      .from('external_citation_health')
      .select('url, status, source_name')
      .in('status', ['broken', 'unreachable']);

    if (fetchError) {
      console.error('Error fetching broken citations:', fetchError);
      throw fetchError;
    }

    console.log(`🔍 Found ${brokenCitations?.length || 0} broken/unreachable citations`);

    const results = {
      processed: 0,
      autoApplied: 0,
      manualReview: 0,
      failed: 0,
      articlesUpdated: 0,
      citationsUpdated: 0,
      details: [] as any[]
    };

    for (const citation of brokenCitations || []) {
      try {
        console.log(`\n🔧 Processing: ${citation.url}`);
        results.processed++;

        // Find an article that uses this citation
        const { data: trackingData, error: trackingError } = await supabaseClient
          .from('citation_usage_tracking')
          .select('article_id')
          .eq('citation_url', citation.url)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (trackingError || !trackingData) {
          console.log(`⚠️  No active articles use this citation, skipping`);
          results.failed++;
          results.details.push({
            url: citation.url,
            status: 'failed',
            reason: 'No active articles use this citation'
          });
          continue;
        }

        // Fetch article data
        const { data: articleData, error: articleError } = await supabaseClient
          .from('blog_articles')
          .select('headline, detailed_content, language')
          .eq('id', trackingData.article_id)
          .single();

        if (articleError || !articleData) {
          console.log(`❌ Failed to fetch article data: ${articleError?.message}`);
          results.failed++;
          results.details.push({
            url: citation.url,
            status: 'failed',
            reason: 'Failed to fetch article data'
          });
          continue;
        }

        console.log(`📄 Using context from article: "${articleData.headline}"`);
        
        // Call discover-better-links to find replacements with proper article context
        const { data: discoveryData, error: discoveryError } = await supabaseClient.functions.invoke(
          'discover-better-links',
          {
            body: {
              originalUrl: citation.url,
              articleHeadline: articleData.headline,
              articleContent: articleData.detailed_content || '',
              articleLanguage: articleData.language || 'en',
              context: citation.source_name || 'Citation from article'
            }
          }
        );

        if (discoveryError || !discoveryData?.suggestions?.length) {
          console.log(`❌ No replacements found for ${citation.url}`);
          results.failed++;
          results.details.push({
            url: citation.url,
            status: 'failed',
            reason: 'No suitable replacements found'
          });
          continue;
        }

        const suggestions = discoveryData.suggestions;
        console.log(`💡 Found ${suggestions.length} suggestions`);

        // Calculate confidence scores and prepare replacements
        const replacementsToInsert = suggestions.map((suggestion: any, index: number) => {
          const relevanceScore = suggestion.relevanceScore || 75;
          const authorityScore = suggestion.authorityScore || 7;
          
          let confidenceScore = 0;
          if (relevanceScore >= 90 && authorityScore >= 8) {
            confidenceScore = 9.5;
          } else if (relevanceScore >= 85 && authorityScore >= 8) {
            confidenceScore = 9.0;
          } else if (relevanceScore >= 80 && authorityScore >= 9) {
            confidenceScore = 8.5;
          } else if (relevanceScore >= 80 && authorityScore >= 8) {
            confidenceScore = 8.0;
          } else if (relevanceScore >= 75 && authorityScore >= 7) {
            confidenceScore = 7.5;
          } else if (relevanceScore >= 70 && authorityScore >= 7) {
            confidenceScore = 7.0;
          } else {
            confidenceScore = 6.5;
          }

          return {
            original_url: citation.url,
            original_source: citation.source_name || 'Unknown',
            replacement_url: suggestion.suggestedUrl,
            replacement_source: suggestion.sourceName || 'Unknown',
            replacement_reason: suggestion.reason || 'Better source found',
            confidence_score: confidenceScore,
            status: confidenceScore >= 8.0 ? 'approved' : 'suggested',
            suggested_by: 'batch-fix-auto'
          };
        }).sort((a: any, b: any) => b.confidence_score - a.confidence_score);

        // Insert replacements into database
        const { error: insertError } = await supabaseClient
          .from('dead_link_replacements')
          .insert(replacementsToInsert);

        if (insertError) {
          console.error(`Error inserting replacements for ${citation.url}:`, insertError);
          results.failed++;
          continue;
        }

        const bestReplacement = replacementsToInsert[0];
        const wasAutoApproved = bestReplacement.status === 'approved';

        if (wasAutoApproved) {
          // Get the ID of the inserted replacement
          const { data: insertedReplacements, error: fetchReplacementError } = await supabaseClient
            .from('dead_link_replacements')
            .select('id')
            .eq('original_url', citation.url)
            .eq('replacement_url', bestReplacement.replacement_url)
            .order('created_at', { ascending: false })
            .limit(1);

          if (fetchReplacementError || !insertedReplacements?.length) {
            console.log(`⚠️ Auto-approved but couldn't fetch ID for ${citation.url}`);
            results.manualReview++;
            results.details.push({
              url: citation.url,
              status: 'auto-approved',
              score: bestReplacement.confidence_score,
              replacement: bestReplacement.replacement_url,
              action: 'manual-apply-required'
            });
            continue;
          }

          const replacementId = insertedReplacements[0].id;
          console.log(`🚀 Auto-applying replacement ${replacementId} (confidence: ${bestReplacement.confidence_score}/10)`);

          // Apply the replacement
          const { data: applyResult, error: applyError } = await supabaseClient.functions.invoke(
            'apply-citation-replacement',
            {
              body: {
                replacementIds: [replacementId],
                preview: false
              }
            }
          );

          if (applyError || !applyResult?.success) {
            console.log(`⚠️ Auto-application failed for ${citation.url}`);
            results.manualReview++;
            results.details.push({
              url: citation.url,
              status: 'auto-approved',
              score: bestReplacement.confidence_score,
              replacement: bestReplacement.replacement_url,
              action: 'application-failed',
              error: applyError?.message || 'Unknown error'
            });
            continue;
          }

          console.log(`✅ Successfully auto-applied replacement for ${citation.url}`);
          results.autoApplied++;
          results.articlesUpdated += applyResult.articlesUpdated || 0;
          results.citationsUpdated += applyResult.citationsUpdated || 0;
          results.details.push({
            url: citation.url,
            status: 'auto-applied',
            score: bestReplacement.confidence_score,
            replacement: bestReplacement.replacement_url,
            articlesUpdated: applyResult.articlesUpdated,
            citationsUpdated: applyResult.citationsUpdated
          });
        } else {
          console.log(`📋 Saved for manual review: ${citation.url} (score: ${bestReplacement.confidence_score}/10)`);
          results.manualReview++;
          results.details.push({
            url: citation.url,
            status: 'manual-review',
            score: bestReplacement.confidence_score,
            replacement: bestReplacement.replacement_url,
            reason: 'Below auto-approval threshold (8.0)'
          });
        }

      } catch (citationError) {
        console.error(`Error processing citation ${citation.url}:`, citationError);
        results.failed++;
        results.details.push({
          url: citation.url,
          status: 'error',
          error: (citationError as Error).message
        });
      }
    }

    console.log('\n🎉 Batch fix complete!');
    console.log(`📊 Results:
      - Processed: ${results.processed}
      - Auto-applied: ${results.autoApplied}
      - Manual review: ${results.manualReview}
      - Failed: ${results.failed}
      - Articles updated: ${results.articlesUpdated}
      - Citations updated: ${results.citationsUpdated}
    `);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in batch-fix-broken-citations:', error);
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
