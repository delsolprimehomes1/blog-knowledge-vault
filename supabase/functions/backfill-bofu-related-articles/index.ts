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

    console.log('🔄 Starting BOFU articles backfill...');

    // Step 1: Find orphaned BOFU articles (no cluster_id)
    const { data: orphanedBofuArticles, error: orphanedError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, language, category, funnel_stage')
      .eq('status', 'published')
      .eq('funnel_stage', 'BOFU')
      .is('cluster_id', null);

    if (orphanedError) {
      console.error('Error fetching orphaned BOFU articles:', orphanedError);
      throw orphanedError;
    }

    console.log(`📊 Found ${orphanedBofuArticles?.length || 0} orphaned BOFU articles`);

    let orphanedLinked = 0;

    // Step 2: For each orphaned BOFU, find relevant MOFU articles by language and category
    for (const bofuArticle of orphanedBofuArticles || []) {
      console.log(`\n🔄 Processing orphaned: "${bofuArticle.headline}"`);

      // Find MOFU articles in same language and category
      const { data: mofuArticles, error: mofuError } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, funnel_stage, featured_image_url')
        .eq('status', 'published')
        .eq('language', bofuArticle.language)
        .eq('category', bofuArticle.category)
        .eq('funnel_stage', 'MOFU')
        .limit(5);

      if (mofuError) {
        console.error(`Error fetching MOFU articles for ${bofuArticle.id}:`, mofuError);
        continue;
      }

      const relatedArticles = (mofuArticles || []).map(a => ({
        id: a.id,
        slug: a.slug,
        headline: a.headline,
        stage: a.funnel_stage,
        featured_image_url: a.featured_image_url
      }));

      if (relatedArticles.length > 0) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ related_cluster_articles: relatedArticles })
          .eq('id', bofuArticle.id);

        if (updateError) {
          console.error(`❌ Error updating ${bofuArticle.id}:`, updateError);
        } else {
          console.log(`  ✅ Linked to ${relatedArticles.length} MOFU articles`);
          orphanedLinked++;
        }
      } else {
        console.log(`  ⚠️ No MOFU articles found in same language/category`);
      }
    }

    // Step 3: Handle BOFU articles WITH cluster_id (use cluster logic)
    const { data: clusteredBofuArticles, error: clusteredError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, cluster_id, funnel_stage, status')
      .eq('status', 'published')
      .eq('funnel_stage', 'BOFU')
      .not('cluster_id', 'is', null)
      .or('related_cluster_articles.is.null,related_cluster_articles.eq.[]');

    if (clusteredError) {
      console.error('Error fetching clustered BOFU articles:', clusteredError);
      throw clusteredError;
    }

    console.log(`\n📊 Found ${clusteredBofuArticles?.length || 0} clustered BOFU articles to backfill`);

    let clusteredLinked = 0;

    // Process each clustered BOFU article
    for (const bofuArticle of clusteredBofuArticles || []) {
      console.log(`\n🔄 Processing clustered: "${bofuArticle.headline}"`);

      // Get MOFU articles from same cluster
      const { data: clusterMofuArticles, error: clusterMofuError } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, funnel_stage, featured_image_url')
        .eq('cluster_id', bofuArticle.cluster_id)
        .eq('status', 'published')
        .eq('funnel_stage', 'MOFU');

      if (clusterMofuError) {
        console.error(`Error fetching cluster MOFU articles:`, clusterMofuError);
        continue;
      }

      const relatedClusterArticles = (clusterMofuArticles || []).map(a => ({
        id: a.id,
        slug: a.slug,
        headline: a.headline,
        stage: a.funnel_stage,
        featured_image_url: a.featured_image_url
      }));

      if (relatedClusterArticles.length > 0) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ related_cluster_articles: relatedClusterArticles })
          .eq('id', bofuArticle.id);

        if (updateError) {
          console.error(`❌ Error updating ${bofuArticle.id}:`, updateError);
        } else {
          console.log(`  ✅ Linked to ${relatedClusterArticles.length} cluster MOFU articles`);
          clusteredLinked++;
        }
      } else {
        console.log(`  ⚠️ No MOFU articles in cluster`);
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`📊 Summary:`);
    console.log(`  - Orphaned BOFU linked: ${orphanedLinked}`);
    console.log(`  - Clustered BOFU linked: ${clusteredLinked}`);
    console.log(`  - Total updated: ${orphanedLinked + clusteredLinked}`);

    return new Response(
      JSON.stringify({
        success: true,
        orphaned_linked: orphanedLinked,
        clustered_linked: clusteredLinked,
        total_updated: orphanedLinked + clusteredLinked
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
