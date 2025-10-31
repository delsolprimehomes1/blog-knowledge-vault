import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanedArticle {
  id: string;
  slug: string;
  headline: string;
  language: string;
  category: string;
  funnel_stage: string;
}

interface ClusterGroup {
  language: string;
  category: string;
  articles: OrphanedArticle[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Fetching orphaned articles (no cluster_id)...');

    // Fetch all published articles without cluster_id and not BOFU
    const { data: orphanedArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, language, category, funnel_stage')
      .eq('status', 'published')
      .is('cluster_id', null)
      .neq('funnel_stage', 'BOFU'); // BOFU articles don't need CTAs

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${orphanedArticles.length} orphaned articles`);

    // Group articles by language and category
    const groups: Map<string, ClusterGroup> = new Map();

    for (const article of orphanedArticles) {
      const key = `${article.language}_${article.category}`;
      if (!groups.has(key)) {
        groups.set(key, {
          language: article.language,
          category: article.category,
          articles: []
        });
      }
      groups.get(key)!.articles.push(article);
    }

    console.log(`📦 Grouped into ${groups.size} language+category combinations`);

    let newClustersCreated = 0;
    let articlesAssignedToNew = 0;
    let articlesAssignedToExisting = 0;

    // Process each group
    for (const [key, group] of groups.entries()) {
      console.log(`\n🔄 Processing group: ${key} (${group.articles.length} articles)`);

      if (group.articles.length >= 4) {
        // Create new cluster if we have enough articles
        const clusterTheme = `${group.category} - ${group.language.toUpperCase()}`;
        const newClusterId = crypto.randomUUID();

        console.log(`✨ Creating new cluster: ${clusterTheme}`);

        // Balance funnel stages
        const tofuArticles = group.articles.filter(a => a.funnel_stage === 'TOFU');
        const mofuArticles = group.articles.filter(a => a.funnel_stage === 'MOFU');

        // Take up to 3 TOFU and 3 MOFU (or whatever we have)
        const selectedArticles = [
          ...tofuArticles.slice(0, 3),
          ...mofuArticles.slice(0, 3)
        ];

        if (selectedArticles.length > 0) {
          // Assign cluster_id to selected articles
          for (let i = 0; i < selectedArticles.length; i++) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({
                cluster_id: newClusterId,
                cluster_number: i + 1,
                cluster_theme: clusterTheme
              })
              .eq('id', selectedArticles[i].id);

            if (updateError) {
              console.error(`❌ Error updating article ${selectedArticles[i].slug}:`, updateError);
            } else {
              articlesAssignedToNew++;
              console.log(`  ✅ Assigned: ${selectedArticles[i].slug}`);
            }
          }

          newClustersCreated++;
        }

      } else {
        // Group has < 4 articles, try to find matching existing cluster
        console.log(`🔍 Finding existing cluster for ${group.articles.length} articles...`);

        const { data: existingClusters, error: clusterError } = await supabase
          .from('blog_articles')
          .select('cluster_id, cluster_theme, language, category')
          .eq('language', group.language)
          .eq('category', group.category)
          .not('cluster_id', 'is', null)
          .limit(10);

        if (!clusterError && existingClusters && existingClusters.length > 0) {
          // Get the most common cluster_id
          const clusterCounts = new Map<string, number>();
          existingClusters.forEach(c => {
            if (c.cluster_id) {
              clusterCounts.set(c.cluster_id, (clusterCounts.get(c.cluster_id) || 0) + 1);
            }
          });

          const [targetClusterId] = Array.from(clusterCounts.entries())
            .sort((a, b) => b[1] - a[1])[0] || [null, 0];

          if (targetClusterId) {
            const targetCluster = existingClusters.find(c => c.cluster_id === targetClusterId);
            console.log(`  📌 Found existing cluster: ${targetCluster?.cluster_theme}`);

            // Get current max cluster_number
            const { data: clusterArticles } = await supabase
              .from('blog_articles')
              .select('cluster_number')
              .eq('cluster_id', targetClusterId)
              .order('cluster_number', { ascending: false })
              .limit(1);

            const nextNumber = (clusterArticles && clusterArticles[0]?.cluster_number || 0) + 1;

            // Assign to existing cluster
            for (let i = 0; i < group.articles.length; i++) {
              const { error: updateError } = await supabase
                .from('blog_articles')
                .update({
                  cluster_id: targetClusterId,
                  cluster_number: nextNumber + i,
                  cluster_theme: targetCluster?.cluster_theme
                })
                .eq('id', group.articles[i].id);

              if (!updateError) {
                articlesAssignedToExisting++;
                console.log(`  ✅ Assigned to existing: ${group.articles[i].slug}`);
              }
            }
          }
        } else {
          console.log(`  ⚠️ No matching clusters found, skipping for now`);
        }
      }
    }

    // Trigger backfill function to populate related_cluster_articles
    console.log('\n🔄 Triggering cluster backfill...');
    try {
      const { error: backfillError } = await supabase.functions.invoke('backfill-cluster-related-articles', {
        body: {}
      });

      if (backfillError) {
        console.error('⚠️ Backfill error:', backfillError);
      } else {
        console.log('✅ Backfill completed');
      }
    } catch (backfillErr) {
      console.error('⚠️ Backfill failed:', backfillErr);
    }

    const summary = {
      success: true,
      totalOrphanedArticles: orphanedArticles.length,
      newClustersCreated,
      articlesAssignedToNew,
      articlesAssignedToExisting,
      totalArticlesProcessed: articlesAssignedToNew + articlesAssignedToExisting,
      remainingOrphans: orphanedArticles.length - (articlesAssignedToNew + articlesAssignedToExisting),
      message: `Created ${newClustersCreated} new clusters and assigned ${articlesAssignedToNew + articlesAssignedToExisting} articles`
    };

    console.log('\n✅ Auto-clustering complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
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
