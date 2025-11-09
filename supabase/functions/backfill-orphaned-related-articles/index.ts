import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelatedArticle {
  id: string;
  slug: string;
  headline: string;
  stage: string;
  featured_image_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔄 Starting intelligent backfill of related_cluster_articles...');

    // Get articles with empty or null related_cluster_articles that are published
    const { data: orphanedArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, category, language, funnel_stage, cluster_id, featured_image_url')
      .eq('status', 'published')
      .or('related_cluster_articles.is.null,related_cluster_articles.eq.[]');

    if (fetchError) {
      console.error('Error fetching orphaned articles:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${orphanedArticles.length} articles needing related articles`);

    let updatedCount = 0;
    let skippedCount = 0;
    const results: any[] = [];

    for (const article of orphanedArticles) {
      try {
        console.log(`\n🔍 Processing: ${article.headline} (${article.funnel_stage})`);

        let relatedArticles: RelatedArticle[] = [];

        // Strategy 1: Try to find articles in the same cluster
        if (article.cluster_id) {
          console.log(`  📎 Searching by cluster_id: ${article.cluster_id}`);
          
          const { data: clusterSiblings } = await supabase
            .from('blog_articles')
            .select('id, slug, headline, funnel_stage, featured_image_url')
            .eq('cluster_id', article.cluster_id)
            .eq('status', 'published')
            .neq('id', article.id);

          if (clusterSiblings && clusterSiblings.length > 0) {
            // Apply funnel stage logic
            if (article.funnel_stage === 'BOFU') {
              // BOFU articles link to MOFU articles
              relatedArticles = clusterSiblings
                .filter(a => a.funnel_stage === 'MOFU')
                .map(a => ({
                  id: a.id,
                  slug: a.slug,
                  headline: a.headline,
                  stage: a.funnel_stage,
                  featured_image_url: a.featured_image_url
                }));
            } else if (article.funnel_stage === 'MOFU') {
              // MOFU articles link to BOFU (priority) and TOFU
              const bofuArticles = clusterSiblings.filter(a => a.funnel_stage === 'BOFU');
              const tofuArticles = clusterSiblings.filter(a => a.funnel_stage === 'TOFU');
              relatedArticles = [...bofuArticles, ...tofuArticles].map(a => ({
                id: a.id,
                slug: a.slug,
                headline: a.headline,
                stage: a.funnel_stage,
                featured_image_url: a.featured_image_url
              }));
            } else {
              // TOFU articles link to MOFU (priority) and BOFU
              const mofuArticles = clusterSiblings.filter(a => a.funnel_stage === 'MOFU');
              const bofuArticles = clusterSiblings.filter(a => a.funnel_stage === 'BOFU');
              relatedArticles = [...mofuArticles, ...bofuArticles].map(a => ({
                id: a.id,
                slug: a.slug,
                headline: a.headline,
                stage: a.funnel_stage,
                featured_image_url: a.featured_image_url
              }));
            }
            
            console.log(`  ✅ Found ${relatedArticles.length} cluster siblings`);
          }
        }

        // Strategy 2: If no cluster or not enough articles, find by category + language
        if (relatedArticles.length < 2) {
          console.log(`  🔎 Searching by category (${article.category}) + language (${article.language})`);
          
          const { data: categoryMatches } = await supabase
            .from('blog_articles')
            .select('id, slug, headline, funnel_stage, featured_image_url')
            .eq('category', article.category)
            .eq('language', article.language)
            .eq('status', 'published')
            .neq('id', article.id)
            .limit(20); // Get more than we need so we can filter

          if (categoryMatches && categoryMatches.length > 0) {
            // Apply same funnel stage logic
            let candidates: RelatedArticle[] = [];
            
            if (article.funnel_stage === 'BOFU') {
              candidates = categoryMatches
                .filter(a => a.funnel_stage === 'MOFU')
                .map(a => ({
                  id: a.id,
                  slug: a.slug,
                  headline: a.headline,
                  stage: a.funnel_stage,
                  featured_image_url: a.featured_image_url
                }));
            } else if (article.funnel_stage === 'MOFU') {
              const bofuArticles = categoryMatches.filter(a => a.funnel_stage === 'BOFU');
              const tofuArticles = categoryMatches.filter(a => a.funnel_stage === 'TOFU');
              candidates = [...bofuArticles, ...tofuArticles].map(a => ({
                id: a.id,
                slug: a.slug,
                headline: a.headline,
                stage: a.funnel_stage,
                featured_image_url: a.featured_image_url
              }));
            } else {
              const mofuArticles = categoryMatches.filter(a => a.funnel_stage === 'MOFU');
              const bofuArticles = categoryMatches.filter(a => a.funnel_stage === 'BOFU');
              candidates = [...mofuArticles, ...bofuArticles].map(a => ({
                id: a.id,
                slug: a.slug,
                headline: a.headline,
                stage: a.funnel_stage,
                featured_image_url: a.featured_image_url
              }));
            }

            // Prioritize articles with images
            const withImages = candidates.filter(a => a.featured_image_url);
            const withoutImages = candidates.filter(a => !a.featured_image_url);
            
            relatedArticles = [...relatedArticles, ...withImages, ...withoutImages];
            console.log(`  ✅ Found ${candidates.length} category matches`);
          }
        }

        // Limit to 2-4 articles (prefer 3-4 for better UX)
        const finalRelated = relatedArticles.slice(0, 4);

        if (finalRelated.length === 0) {
          console.log(`  ⚠️ No suitable related articles found for ${article.slug}`);
          skippedCount++;
          results.push({
            article_id: article.id,
            slug: article.slug,
            status: 'skipped',
            reason: 'no_matches_found'
          });
          continue;
        }

        // Update the article
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            related_cluster_articles: finalRelated
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`  ❌ Error updating ${article.slug}:`, updateError);
          results.push({
            article_id: article.id,
            slug: article.slug,
            status: 'error',
            error: updateError.message
          });
        } else {
          console.log(`  ✅ Updated ${article.slug} with ${finalRelated.length} related articles`);
          updatedCount++;
          results.push({
            article_id: article.id,
            slug: article.slug,
            status: 'success',
            related_count: finalRelated.length,
            matched_by: article.cluster_id ? 'cluster' : 'category'
          });
        }

      } catch (error) {
        console.error(`  ❌ Exception processing ${article.slug}:`, error);
        results.push({
          article_id: article.id,
          slug: article.slug,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`📊 Summary:`);
    console.log(`  - Total processed: ${orphanedArticles.length}`);
    console.log(`  - Successfully updated: ${updatedCount}`);
    console.log(`  - Skipped (no matches): ${skippedCount}`);
    console.log(`  - Errors: ${results.filter(r => r.status === 'error').length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_processed: orphanedArticles.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: results.filter(r => r.status === 'error').length,
        details: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Fatal error in backfill:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
