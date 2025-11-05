import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isCompetitor } from "../shared/competitorBlacklist.ts";

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

    const { articleIds } = await req.json();

    console.log('🔄 Starting batch replacement for banned citations...');

    // Fetch articles with banned citations
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, external_citations, detailed_content, language, slug')
      .eq('status', 'published')
      .not('external_citations', 'is', null)
      .in('id', articleIds || []);

    if (articlesError) throw articlesError;

    let processedCount = 0;
    let autoAppliedCount = 0;
    let manualReviewCount = 0;
    let failedCount = 0;

    const results: Array<{
      articleId: string;
      articleTitle: string;
      originalUrl: string;
      replacementUrl: string | null;
      confidence: number;
      action: 'auto_applied' | 'manual_review' | 'failed';
    }> = [];

    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      const bannedCitations = citations.filter(c => isCompetitor(c.url));

      if (bannedCitations.length === 0) continue;

      console.log(`📝 Processing "${article.headline}" - ${bannedCitations.length} banned citations`);

      for (const bannedCitation of bannedCitations) {
        processedCount++;

        try {
          // Extract context around the citation (find paragraph in content)
          const content = article.detailed_content || '';
          const anchorText = bannedCitation.text || '';
          let citationContext = '';

          if (anchorText && content.includes(anchorText)) {
            const index = content.indexOf(anchorText);
            const start = Math.max(0, index - 200);
            const end = Math.min(content.length, index + anchorText.length + 200);
            citationContext = content.substring(start, end);
          }

          // Call discover-better-links function
          const { data: suggestions, error: suggestError } = await supabase.functions.invoke(
            'discover-better-links',
            {
              body: {
                originalUrl: bannedCitation.url,
                articleHeadline: article.headline,
                articleContent: content.substring(0, 2000), // First 2000 chars
                articleLanguage: article.language,
                citationContext,
                mustBeApproved: true, // Only approved domains
              }
            }
          );

          if (suggestError || !suggestions?.alternativeUrls?.length) {
            // No replacement found
            failedCount++;
            results.push({
              articleId: article.id,
              articleTitle: article.headline,
              originalUrl: bannedCitation.url,
              replacementUrl: null,
              confidence: 0,
              action: 'failed',
            });

            // Create dead link replacement entry for manual review
            await supabase
              .from('dead_link_replacements')
              .insert({
                original_url: bannedCitation.url,
                original_source: bannedCitation.source,
                replacement_url: '',
                replacement_source: '',
                replacement_reason: 'Banned competitor domain - no suitable replacement found',
                confidence_score: 0,
                status: 'suggested',
                suggested_by: 'auto_sanitization',
              });

            continue;
          }

          // Calculate confidence (simplified scoring)
          const bestSuggestion = suggestions.alternativeUrls[0];
          const confidence = suggestions.quality_score || 7.5;

          if (confidence >= 8.0) {
            // Auto-apply high-confidence replacements
            const updatedCitations = citations.map(c =>
              c.url === bannedCitation.url
                ? { ...c, url: bestSuggestion, source: new URL(bestSuggestion).hostname }
                : c
            );

            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                external_citations: updatedCitations,
                date_modified: new Date().toISOString(),
              })
              .eq('id', article.id);

            if (updateError) throw updateError;

            // Record the update
            await supabase.from('content_updates').insert({
              article_id: article.id,
              update_type: 'citation_replacement',
              update_notes: `Auto-replaced banned domain ${bannedCitation.url} with ${bestSuggestion}`,
              updated_fields: ['external_citations'],
            });

            autoAppliedCount++;
            results.push({
              articleId: article.id,
              articleTitle: article.headline,
              originalUrl: bannedCitation.url,
              replacementUrl: bestSuggestion,
              confidence,
              action: 'auto_applied',
            });

            console.log(`✅ Auto-applied: ${bannedCitation.url} → ${bestSuggestion}`);
          } else {
            // Add to manual review queue
            await supabase
              .from('dead_link_replacements')
              .insert({
                original_url: bannedCitation.url,
                original_source: bannedCitation.source,
                replacement_url: bestSuggestion,
                replacement_source: new URL(bestSuggestion).hostname,
                replacement_reason: 'Banned competitor domain - requires manual approval',
                confidence_score: confidence,
                status: 'suggested',
                suggested_by: 'auto_sanitization',
              });

            manualReviewCount++;
            results.push({
              articleId: article.id,
              articleTitle: article.headline,
              originalUrl: bannedCitation.url,
              replacementUrl: bestSuggestion,
              confidence,
              action: 'manual_review',
            });

            console.log(`📋 Manual review: ${bannedCitation.url} → ${bestSuggestion} (${confidence.toFixed(1)})`);
          }

        } catch (error) {
          console.error(`Error processing citation ${bannedCitation.url}:`, error);
          failedCount++;
          results.push({
            articleId: article.id,
            articleTitle: article.headline,
            originalUrl: bannedCitation.url,
            replacementUrl: null,
            confidence: 0,
            action: 'failed',
          });
        }
      }
    }

    const summary = {
      success: true,
      processed: processedCount,
      autoApplied: autoAppliedCount,
      manualReview: manualReviewCount,
      failed: failedCount,
      articlesAffected: new Set(results.map(r => r.articleId)).size,
      results,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Batch replacement complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in batch-replace-banned-citations:', error);
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
