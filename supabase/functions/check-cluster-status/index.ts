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

    console.log(`Checking status for job: ${jobId}`);

    const { data: job, error } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      throw error;
    }

    if (!job) {
      throw new Error('Job not found');
    }

    console.log(`Job ${jobId} status: ${job.status}`);

    // Get chunk status if using new chunked system
    const { data: chunks } = await supabase
      .from('cluster_article_chunks')
      .select('status')
      .eq('parent_job_id', jobId);

    let chunkStatus = null;
    if (chunks && chunks.length > 0) {
      chunkStatus = {
        total: chunks.length,
        completed: chunks.filter(c => c.status === 'completed').length,
        processing: chunks.filter(c => c.status === 'processing').length,
        pending: chunks.filter(c => c.status === 'pending').length,
        failed: chunks.filter(c => c.status === 'failed').length
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: job.status,
        progress: job.progress,
        chunks: chunkStatus,
        articles: job.status === 'completed' ? job.articles : null,
        error: job.error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-cluster-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
