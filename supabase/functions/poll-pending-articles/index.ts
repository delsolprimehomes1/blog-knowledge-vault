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
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('🔍 Polling for pending/stuck article chunks...');

    // 1. Find stuck chunks (processing for >5 minutes) and reset them
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckChunks } = await supabase
      .from('cluster_article_chunks')
      .select('*')
      .eq('status', 'processing')
      .lt('updated_at', fiveMinutesAgo);

    if (stuckChunks && stuckChunks.length > 0) {
      console.log(`⚠️ Found ${stuckChunks.length} stuck chunks, resetting to pending...`);
      
      for (const chunk of stuckChunks) {
        await supabase
          .from('cluster_article_chunks')
          .update({
            status: 'pending',
            error_message: 'Chunk timed out, retrying...',
            updated_at: new Date().toISOString()
          })
          .eq('id', chunk.id);
      }
    }

    // 2. Find active jobs with pending chunks
    const { data: activeJobs } = await supabase
      .from('cluster_generations')
      .select('id')
      .eq('status', 'generating');

    if (!activeJobs || activeJobs.length === 0) {
      console.log('✅ No active jobs found');
      return new Response(JSON.stringify({ success: true, message: 'No active jobs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${activeJobs.length} active jobs`);

    // 3. For each active job, find pending chunks
    for (const job of activeJobs) {
      const { data: pendingChunks } = await supabase
        .from('cluster_article_chunks')
        .select('*')
        .eq('parent_job_id', job.id)
        .eq('status', 'pending')
        .order('chunk_number')
        .limit(1);

      if (pendingChunks && pendingChunks.length > 0) {
        const chunk = pendingChunks[0];
        console.log(`🚀 Triggering processing for job ${job.id}, chunk ${chunk.chunk_number}`);
        
        // Invoke process-cluster-article function
        await supabase.functions.invoke('process-cluster-article', {
          body: { parentJobId: job.id }
        });
      } else {
        // No pending chunks, check if job should be marked completed
        const { data: allChunks } = await supabase
          .from('cluster_article_chunks')
          .select('status')
          .eq('parent_job_id', job.id);

        const allCompleted = allChunks?.every(c => c.status === 'completed');
        const someProcessing = allChunks?.some(c => c.status === 'processing');

        if (allCompleted && !someProcessing) {
          console.log(`✅ Job ${job.id} completed, finalizing...`);
          
          const { data: completedChunks } = await supabase
            .from('cluster_article_chunks')
            .select('article_data')
            .eq('parent_job_id', job.id)
            .eq('status', 'completed')
            .order('chunk_number');

          const articles = completedChunks?.map(c => c.article_data) || [];

          await supabase
            .from('cluster_generations')
            .update({
              status: 'completed',
              articles: articles,
              progress: {
                current_step: 12,
                total_steps: 12,
                current_article: articles.length,
                total_articles: articles.length
              }
            })
            .eq('id', job.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Polling completed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in poll-pending-articles:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
