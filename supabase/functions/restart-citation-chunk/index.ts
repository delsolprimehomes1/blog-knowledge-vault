import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { chunkId, parentJobId } = await req.json();

    if (!chunkId && !parentJobId) {
      throw new Error('Either chunkId or parentJobId is required');
    }

    console.log('Restarting chunk(s):', { chunkId, parentJobId });

    if (chunkId) {
      // Restart specific chunk
      await supabaseClient
        .from('citation_replacement_chunks')
        .update({
          status: 'pending',
          progress_current: 0,
          auto_applied_count: 0,
          manual_review_count: 0,
          failed_count: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', chunkId);

      // Get parent job ID
      const { data: chunk } = await supabaseClient
        .from('citation_replacement_chunks')
        .select('parent_job_id')
        .eq('id', chunkId)
        .single();

      if (chunk) {
        // Trigger processor
        await supabaseClient.functions.invoke('process-citation-chunk', {
          body: { parentJobId: chunk.parent_job_id }
        });
      }
    } else if (parentJobId) {
      // Restart all failed chunks for a job
      await supabaseClient
        .from('citation_replacement_chunks')
        .update({
          status: 'pending',
          progress_current: 0,
          auto_applied_count: 0,
          manual_review_count: 0,
          failed_count: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('parent_job_id', parentJobId)
        .eq('status', 'failed');

      // Reset job status to running
      await supabaseClient
        .from('citation_replacement_jobs')
        .update({
          status: 'running',
          failed_chunks: 0,
          error_message: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', parentJobId);

      // Trigger processor
      await supabaseClient.functions.invoke('process-citation-chunk', {
        body: { parentJobId }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in restart-citation-chunk:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});