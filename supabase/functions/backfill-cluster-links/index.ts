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
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('jobId is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`🔗 [Job ${jobId}] Backfilling funnel progression links...`);

    // Get all articles from this cluster
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, funnel_stage, related_cluster_articles')
      .eq('cluster_id', jobId)
      .order('funnel_stage'); // BOFU < MOFU < TOFU alphabetically

    if (fetchError) throw fetchError;
    if (!articles || articles.length === 0) {
      console.log(`⚠️ [Job ${jobId}] No articles found`);
      return new Response(JSON.stringify({ success: true, message: 'No articles to link' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`  Found ${articles.length} articles: ${articles.map(a => a.funnel_stage).join(', ')}`);

    // Group articles by funnel stage
    const tofuArticles = articles.filter(a => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter(a => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter(a => a.funnel_stage === 'BOFU');

    console.log(`  TOFU: ${tofuArticles.length}, MOFU: ${mofuArticles.length}, BOFU: ${bofuArticles.length}`);

    let updateCount = 0;

    // TOFU articles → link to MOFU articles
    for (const tofu of tofuArticles) {
      if (mofuArticles.length > 0) {
        const links = mofuArticles.map(mofu => ({
          slug: mofu.slug,
          headline: mofu.headline,
          funnel_stage: mofu.funnel_stage
        }));

        await supabase
          .from('blog_articles')
          .update({ related_cluster_articles: links })
          .eq('id', tofu.id);

        console.log(`  ✅ Linked TOFU "${tofu.headline}" → ${links.length} MOFU articles`);
        updateCount++;
      }
    }

    // MOFU articles → link to BOFU articles
    for (const mofu of mofuArticles) {
      if (bofuArticles.length > 0) {
        const links = bofuArticles.map(bofu => ({
          slug: bofu.slug,
          headline: bofu.headline,
          funnel_stage: bofu.funnel_stage
        }));

        await supabase
          .from('blog_articles')
          .update({ related_cluster_articles: links })
          .eq('id', mofu.id);

        console.log(`  ✅ Linked MOFU "${mofu.headline}" → ${links.length} BOFU articles`);
        updateCount++;
      }
    }

    console.log(`✅ [Job ${jobId}] Backfilled ${updateCount} funnel progression links`);

    return new Response(JSON.stringify({ 
      success: true, 
      updatedArticles: updateCount,
      tofuCount: tofuArticles.length,
      mofuCount: mofuArticles.length,
      bofuCount: bofuArticles.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in backfill-cluster-links:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});