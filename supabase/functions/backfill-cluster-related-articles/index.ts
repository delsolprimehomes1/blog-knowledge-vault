import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('🔄 Starting backfill of related_cluster_articles...');

    // Get all distinct cluster IDs
    const { data: clusters, error: clusterError } = await supabase
      .from('blog_articles')
      .select('cluster_id')
      .not('cluster_id', 'is', null)
      .order('cluster_id');

    if (clusterError) {
      console.error('Error fetching clusters:', clusterError);
      throw clusterError;
    }

    // Get unique cluster IDs
    const uniqueClusterIds = [...new Set(clusters?.map((c: any) => c.cluster_id) || [])];
    console.log(`📊 Found ${uniqueClusterIds.length} clusters to process`);

    let totalArticlesUpdated = 0;
    let totalErrors = 0;

    // Process each cluster
    for (const clusterId of uniqueClusterIds) {
      try {
        console.log(`\n🔄 Processing cluster: ${clusterId}`);

        // Get all articles in this cluster
        const { data: clusterArticles, error: articlesError } = await supabase
          .from('blog_articles')
          .select('id, slug, headline, funnel_stage, status, featured_image_url')
          .eq('cluster_id', clusterId);

        if (articlesError) {
          console.error(`Error fetching articles for cluster ${clusterId}:`, articlesError);
          totalErrors++;
          continue;
        }

        console.log(`  Found ${clusterArticles.length} articles in cluster`);

        // Update each article with sibling data
        for (const article of clusterArticles) {
          try {
            // Build sibling articles based on funnel stage
            let relatedClusterArticles;
            
            if (article.funnel_stage === 'BOFU') {
              // BOFU articles show MOFU siblings for "Related Reading"
              relatedClusterArticles = clusterArticles
                .filter((a: any) => 
                  a.id !== article.id && 
                  a.status === 'published' &&
                  a.funnel_stage === 'MOFU'
                )
                .map((a: any) => ({
                  id: a.id,
                  slug: a.slug,
                  headline: a.headline,
                  stage: a.funnel_stage,
                  featured_image_url: a.featured_image_url
                }));
              
              console.log(`  ✅ BOFU article "${article.headline}" - linked to ${relatedClusterArticles.length} MOFU siblings`);
            } else {
              // TOFU/MOFU articles show all published siblings
              relatedClusterArticles = clusterArticles
                .filter((a: any) => 
                  a.id !== article.id && 
                  a.status === 'published'
                )
                .map((a: any) => ({
                  id: a.id,
                  slug: a.slug,
                  headline: a.headline,
                  stage: a.funnel_stage,
                  featured_image_url: a.featured_image_url
                }));
            }

            // Update article
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({
                related_cluster_articles: relatedClusterArticles
              })
              .eq('id', article.id);

            if (updateError) {
              console.error(`  ❌ Error updating article ${article.id}:`, updateError);
              totalErrors++;
            } else {
              console.log(`  ✅ Updated "${article.headline}" with ${relatedClusterArticles.length} sibling articles`);
              totalArticlesUpdated++;
            }

          } catch (error) {
            console.error(`  ❌ Exception updating article ${article.id}:`, error);
            totalErrors++;
          }
        }

        console.log(`  ✅ Cluster ${clusterId} complete`);

      } catch (error) {
        console.error(`❌ Error processing cluster ${clusterId}:`, error);
        totalErrors++;
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`📊 Summary:`);
    console.log(`  - Clusters processed: ${uniqueClusterIds.length}`);
    console.log(`  - Articles updated: ${totalArticlesUpdated}`);
    console.log(`  - Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: true,
        clusters_processed: uniqueClusterIds.length,
        articles_updated: totalArticlesUpdated,
        errors: totalErrors
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
