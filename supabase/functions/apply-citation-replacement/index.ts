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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { replacementIds, preview = false } = await req.json();

    if (!Array.isArray(replacementIds) || replacementIds.length === 0) {
      throw new Error('replacementIds must be a non-empty array');
    }

    console.log(`📝 ${preview ? 'Previewing' : 'Applying'} ${replacementIds.length} replacement(s)...`);

    // Fetch replacement details
    const { data: replacements, error: replError } = await supabase
      .from('dead_link_replacements')
      .select('*')
      .in('id', replacementIds)
      .eq('status', 'approved');

    if (replError) throw replError;
    if (!replacements || replacements.length === 0) {
      throw new Error('No approved replacements found with given IDs');
    }

    const results = [];
    const affectedArticles = [];

    for (const replacement of replacements) {
      console.log(`🔄 Processing: ${replacement.original_url} → ${replacement.replacement_url}`);

      // Validate replacement URL is still accessible
      try {
        const checkResponse = await fetch(replacement.replacement_url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        // Allow 403 (Forbidden) for government sites with bot protection
        // Only reject on actual errors (404, 500+)
        if (!checkResponse.ok && checkResponse.status !== 403) {
          console.error(`❌ Replacement URL returned ${checkResponse.status}`);
          await supabase
            .from('dead_link_replacements')
            .update({ status: 'invalid' })
            .eq('id', replacement.id);
          continue;
        }
        
        if (checkResponse.status === 403) {
          console.log(`⚠️ 403 on ${replacement.replacement_url} - allowing (likely bot protection)`);
        }
      } catch (error) {
        console.error(`❌ Failed to validate replacement URL:`, error);
        continue;
      }

      // Find articles using this citation
      // First try citation_usage_tracking (fast path)
      const { data: usageRecords, error: usageError } = await supabase
        .from('citation_usage_tracking')
        .select('article_id')
        .eq('citation_url', replacement.original_url)
        .eq('is_active', true);

      if (usageError) throw usageError;

      let articleIds = [...new Set(usageRecords?.map(r => r.article_id) || [])];

      // FALLBACK: If tracking table is empty, query articles directly
      if (articleIds.length === 0) {
        console.log('⚠️ No tracking records found, querying articles directly...');
        
        const { data: allArticles, error: articleError } = await supabase
          .from('blog_articles')
          .select('id, external_citations')
          .not('external_citations', 'is', null);
        
        if (articleError) throw articleError;
        
        // Filter articles that contain this URL in their citations
        const matchingArticles = (allArticles || []).filter(article => {
          const citations = article.external_citations as any[];
          return citations && citations.some((c: any) => c.url === replacement.original_url);
        });
        
        articleIds = matchingArticles.map(a => a.id);
        console.log(`🔍 Direct query found ${articleIds.length} articles with this URL`);
      }

      console.log(`📚 Found ${articleIds.length} articles to update`);

      let replacementCount = 0;

      for (const articleId of articleIds) {
        // Fetch article
        const { data: article, error: articleError } = await supabase
          .from('blog_articles')
          .select('*')
          .eq('id', articleId)
          .single();

        if (articleError || !article) {
          console.error(`⚠️ Article ${articleId} not found or error:`, articleError);
          continue;
        }

        if (preview) {
          // Count citations in metadata that match the old URL
          let citationMatches = 0;
          const citations = article.external_citations || [];
          if (Array.isArray(citations)) {
            citationMatches = citations.filter((citation: any) => citation.url === replacement.original_url).length;
          }
          replacementCount += citationMatches;
          affectedArticles.push({
            articleId: article.id,
            slug: article.slug,
            headline: article.headline,
            replacements: citationMatches
          });
        } else {
          // Create backup revision
          const { error: revisionError } = await supabase
            .from('article_revisions')
            .insert({
              article_id: article.id,
              revision_type: 'citation_replacement',
              previous_content: article.detailed_content,
              previous_citations: article.external_citations,
              replacement_id: replacement.id,
              change_reason: `Replaced broken citation: ${replacement.original_url}`,
              can_rollback: true,
              rollback_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

          if (revisionError) {
            console.error(`⚠️ Failed to create revision for article ${articleId}:`, revisionError);
            continue;
          }

          // Update external_citations array and count replacements
          let citationMatches = 0;
          let newCitations = article.external_citations || [];
          if (Array.isArray(newCitations)) {
            newCitations = newCitations.map((citation: any) => {
              if (citation.url === replacement.original_url) {
                citationMatches++;
                return { ...citation, url: replacement.replacement_url };
              }
              return citation;
            });
          }
          replacementCount += citationMatches;

          // Update article with date_modified
          const now = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({
              external_citations: newCitations,
              updated_at: now,
              date_modified: now
            })
            .eq('id', article.id);

          if (updateError) {
            console.error(`⚠️ Failed to update article ${articleId}:`, updateError);
            continue;
          }

          // Track content update
          await supabase.from('content_updates').insert({
            article_id: article.id,
            update_type: 'citations',
            updated_fields: ['external_citations'],
            new_date_modified: now,
            update_notes: `Replaced citation: ${replacement.original_url} → ${replacement.replacement_url}`
          });

          // Update citation usage tracking
          await supabase
            .from('citation_usage_tracking')
            .update({ 
              citation_url: replacement.replacement_url,
              updated_at: new Date().toISOString()
            })
            .eq('article_id', article.id)
            .eq('citation_url', replacement.original_url);

          affectedArticles.push({
            articleId: article.id,
            slug: article.slug,
            headline: article.headline,
            replacements: citationMatches
          });

          console.log(`✅ Updated article ${article.slug} (${citationMatches} citations updated)`);
        }
      }

      // Only mark as 'applied' if we actually updated articles
      if (!preview) {
        if (articleIds.length > 0 && replacementCount > 0) {
          // SUCCESS: We found and updated articles
          await supabase
            .from('dead_link_replacements')
            .update({
              status: 'applied',
              applied_at: new Date().toISOString(),
              applied_to_articles: articleIds,
              replacement_count: replacementCount
            })
            .eq('id', replacement.id);
          
          // Mark old URL as replaced in health table
          await supabase
            .from('external_citation_health')
            .update({ 
              status: 'replaced',
              updated_at: new Date().toISOString()
            })
            .eq('url', replacement.original_url);

          // Add new URL to health tracking if not already present
          const { data: existingHealth } = await supabase
            .from('external_citation_health')
            .select('id')
            .eq('url', replacement.replacement_url)
            .maybeSingle();

          if (!existingHealth) {
            await supabase
              .from('external_citation_health')
              .insert({
                url: replacement.replacement_url,
                source_name: replacement.replacement_source,
                status: 'pending',
                first_seen_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            
            console.log(`➕ Added replacement URL to health tracking: ${replacement.replacement_url}`);
          }
          
          console.log(`✅ Replacement marked as applied: ${replacementCount} citations in ${articleIds.length} articles`);
        } else if (articleIds.length === 0) {
          // NO ARTICLES FOUND: Mark as failed, not applied
          await supabase
            .from('dead_link_replacements')
            .update({
              status: 'failed',
              replacement_reason: `Original URL not found in any articles. May have been replaced already or tracking data is stale.`
            })
            .eq('id', replacement.id);
          
          console.log(`❌ Replacement marked as failed: Original URL not found in any articles`);
        } else {
          // FOUND ARTICLES BUT NO CITATIONS: This is weird, log it
          console.log(`⚠️ Found ${articleIds.length} articles but updated 0 citations - possible data inconsistency`);
        }
      }

      results.push({
        replacementId: replacement.id,
        originalUrl: replacement.original_url,
        replacementUrl: replacement.replacement_url,
        articlesAffected: articleIds.length,
        replacementCount
      });
    }

    const totalArticles = [...new Set(affectedArticles.map(a => a.articleId))].length;
    const totalReplacements = results.reduce((sum, r) => sum + r.replacementCount, 0);

    console.log(`✅ ${preview ? 'Preview' : 'Application'} complete: ${totalArticles} articles, ${totalReplacements} citations updated`);

    return new Response(
      JSON.stringify({
        success: true,
        preview,
        articlesUpdated: totalArticles,
        citationsUpdated: totalReplacements,
        affectedArticles,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error applying citation replacement:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
