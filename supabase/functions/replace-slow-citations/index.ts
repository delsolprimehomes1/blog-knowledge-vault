import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting slow citation replacement process...');

    // Fetch all slow citations (>5 seconds) that are actually used in articles
    const { data: slowCitations, error: fetchError } = await supabase
      .from('external_citation_health')
      .select('*')
      .eq('status', 'slow')
      .gt('response_time_ms', 5000)
      .gt('times_verified', 0) // Only citations actually used
      .order('response_time_ms', { ascending: false });

    if (fetchError) {
      console.error('Error fetching slow citations:', fetchError);
      throw fetchError;
    }

    if (!slowCitations || slowCitations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No slow citations found that are in use',
          autoFixed: 0,
          needsReview: 0,
          skipped: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${slowCitations.length} slow citations to process`);

    let autoFixed = 0;
    let needsReview = 0;
    let skipped = 0;
    const results = [];

    for (const citation of slowCitations) {
      console.log(`\nProcessing slow citation: ${citation.url} (${citation.response_time_ms}ms)`);

      // Find articles using this citation
      const { data: usages, error: usageError } = await supabase
        .from('citation_usage_tracking')
        .select('article_id, article:blog_articles(id, headline, detailed_content, language, funnel_stage)')
        .eq('citation_url', citation.url)
        .eq('is_active', true);

      if (usageError || !usages || usages.length === 0) {
        console.log(`No articles found using ${citation.url}, skipping`);
        skipped++;
        continue;
      }

      const articles = usages.map((u: any) => u.article).filter(Boolean);
      console.log(`Found ${articles.length} articles using this citation`);

      // For each article, try to find better alternatives
      for (const article of articles as any[]) {
        try {
          console.log(`Finding replacement for ${citation.url} in article: ${article.headline}`);

          // Call discover-better-links function
          const { data: discoveryData, error: discoveryError } = await supabase.functions.invoke(
            'discover-better-links',
            {
              body: {
                originalUrl: citation.url,
                articleHeadline: article.headline,
                articleContent: article.detailed_content.substring(0, 3000),
                articleLanguage: article.language,
                funnelStage: article.funnel_stage,
                requireApproved: true
              }
            }
          );

          if (discoveryError) {
            console.error(`Discovery error for ${citation.url}:`, discoveryError);
            continue;
          }

          const suggestions = discoveryData?.suggestions || [];
          console.log(`Found ${suggestions.length} alternative suggestions`);

          if (suggestions.length === 0) {
            console.log('No better alternatives found');
            skipped++;
            results.push({
              url: citation.url,
              article: article.headline,
              status: 'no_alternatives',
              message: 'No faster alternatives found'
            });
            continue;
          }

          // Get the best verified suggestion
          const bestSuggestion = suggestions.find((s: any) => s.verified) || suggestions[0];
          
          if (!bestSuggestion) {
            console.log('No suitable replacement found');
            skipped++;
            continue;
          }

          const confidenceScore = (bestSuggestion.authorityScore / 10) + (bestSuggestion.relevanceScore / 10);
          console.log(`Best suggestion: ${bestSuggestion.suggestedUrl} (confidence: ${confidenceScore.toFixed(1)})`);

          // Auto-apply high-confidence replacements (≥8.0)
          if (confidenceScore >= 8.0 && bestSuggestion.verified) {
            console.log('High confidence - auto-applying replacement');

            // Create replacement record with approved status
            const { data: replacement, error: replError } = await supabase
              .from('dead_link_replacements')
              .insert({
                original_url: citation.url,
                replacement_url: bestSuggestion.suggestedUrl,
                original_source: citation.source_name,
                replacement_source: bestSuggestion.sourceName,
                confidence_score: confidenceScore,
                replacement_reason: `Slow response time (${citation.response_time_ms}ms). ${bestSuggestion.reason}`,
                status: 'approved',
                suggested_by: 'auto_slow_fix'
              })
              .select()
              .single();

            if (replError) {
              console.error('Error creating replacement:', replError);
              continue;
            }

            // Apply the replacement immediately
            const { error: applyError } = await supabase.functions.invoke(
              'apply-citation-replacement',
              {
                body: {
                  replacementId: replacement.id,
                  articleIds: [article.id]
                }
              }
            );

            if (applyError) {
              console.error('Error applying replacement:', applyError);
              needsReview++;
              results.push({
                url: citation.url,
                article: article.headline,
                status: 'needs_review',
                suggestion: bestSuggestion.suggestedUrl,
                confidence: confidenceScore,
                message: 'Created but failed to apply'
              });
            } else {
              autoFixed++;
              results.push({
                url: citation.url,
                article: article.headline,
                status: 'auto_fixed',
                newUrl: bestSuggestion.suggestedUrl,
                confidence: confidenceScore,
                oldSpeed: `${citation.response_time_ms}ms`,
                message: 'Successfully replaced'
              });

              // Update health table - delete old, insert new
              await supabase
                .from('external_citation_health')
                .delete()
                .eq('url', citation.url);

              await supabase
                .from('external_citation_health')
                .insert({
                  url: bestSuggestion.suggestedUrl,
                  source_name: bestSuggestion.sourceName,
                  status: 'working',
                  http_status_code: 200,
                  authority_score: bestSuggestion.authorityScore,
                  language: article.language
                });
            }
          } else {
            // Save for manual review
            console.log('Lower confidence - saving for manual review');

            await supabase
              .from('dead_link_replacements')
              .insert({
                original_url: citation.url,
                replacement_url: bestSuggestion.suggestedUrl,
                original_source: citation.source_name,
                replacement_source: bestSuggestion.sourceName,
                confidence_score: confidenceScore,
                replacement_reason: `Slow response time (${citation.response_time_ms}ms). ${bestSuggestion.reason}`,
                status: 'suggested',
                suggested_by: 'auto_slow_fix'
              });

            needsReview++;
            results.push({
              url: citation.url,
              article: article.headline,
              status: 'needs_review',
              suggestion: bestSuggestion.suggestedUrl,
              confidence: confidenceScore,
              message: 'Saved for manual review'
            });
          }

        } catch (error) {
          console.error(`Error processing article ${article.headline}:`, error);
          skipped++;
        }
      }
    }

    console.log(`\nCompleted: ${autoFixed} auto-fixed, ${needsReview} need review, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        autoFixed,
        needsReview,
        skipped,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in replace-slow-citations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
