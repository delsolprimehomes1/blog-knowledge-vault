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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Polling for pending/stuck chunks...');

    // Find jobs that are "running" with pending chunks
    const { data: runningJobs, error: jobsError } = await supabase
      .from('citation_replacement_jobs')
      .select('id, created_at')
      .eq('status', 'running')
      .order('created_at', { ascending: true });

    if (jobsError) throw jobsError;

    if (!runningJobs || runningJobs.length === 0) {
      console.log('✅ No running jobs found');
      return new Response(JSON.stringify({ status: 'no_jobs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${runningJobs.length} running job(s)`);

    let processedCount = 0;
    let rescuedCount = 0;

    for (const job of runningJobs) {
      // Check for stuck chunks (processing for >5 minutes)
      const { data: stuckChunks, error: stuckError } = await supabase
        .from('citation_replacement_chunks')
        .select('id, chunk_number, status, updated_at')
        .eq('parent_job_id', job.id)
        .eq('status', 'processing')
        .lt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (stuckError) {
        console.error('Error finding stuck chunks:', stuckError);
        continue;
      }

      // Reset stuck chunks to pending
      if (stuckChunks && stuckChunks.length > 0) {
        console.log(`🚨 Found ${stuckChunks.length} stuck chunk(s) for job ${job.id}`);
        
        for (const chunk of stuckChunks) {
          await supabase
            .from('citation_replacement_chunks')
            .update({ 
              status: 'pending',
              error_message: 'Auto-reset: chunk was stuck',
              updated_at: new Date().toISOString()
            })
            .eq('id', chunk.id);
          
          rescuedCount++;
          console.log(`♻️ Reset stuck chunk ${chunk.chunk_number}`);
        }
      }

      // Check for pending chunks
      const { data: pendingChunks, error: pendingError } = await supabase
        .from('citation_replacement_chunks')
        .select('id, chunk_number')
        .eq('parent_job_id', job.id)
        .eq('status', 'pending')
        .order('chunk_number', { ascending: true })
        .limit(1);

      if (pendingError) {
        console.error('Error finding pending chunks:', pendingError);
        continue;
      }

      if (pendingChunks && pendingChunks.length > 0) {
        console.log(`▶️ Triggering process-citation-chunk for job ${job.id}`);
        
        // Invoke the processing function
        const { error: invokeError } = await supabase.functions.invoke(
          'process-citation-chunk',
          { body: { parentJobId: job.id } }
        );

        if (invokeError) {
          console.error('Failed to invoke process-citation-chunk:', invokeError);
        } else {
          processedCount++;
          console.log(`✅ Successfully triggered chunk processing for job ${job.id}`);
        }
      } else {
        // No pending chunks - check if job should be finalized
        const { data: allChunks } = await supabase
          .from('citation_replacement_chunks')
          .select('status')
          .eq('parent_job_id', job.id);

        if (allChunks) {
          const allDone = allChunks.every((c: any) => 
            c.status === 'completed' || c.status === 'failed'
          );

          if (allDone) {
            console.log(`🏁 Job ${job.id} has all chunks done, finalizing...`);
            await supabase
              .from('citation_replacement_jobs')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', job.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      status: 'poll_complete',
      jobsChecked: runningJobs.length,
      chunksProcessed: processedCount,
      chunksRescued: rescuedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in poll-pending-chunks:', error);
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
