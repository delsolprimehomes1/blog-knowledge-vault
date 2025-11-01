import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: job, error } = await supabaseClient
      .from('citation_replacement_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    if (!job) {
      throw new Error('Job not found');
    }

    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: job.status,
        progress: {
          current: job.progress_current,
          total: job.progress_total,
          percentage: job.progress_total > 0 
            ? Math.round((job.progress_current / job.progress_total) * 100)
            : 0
        },
        articles_processed: job.articles_processed,
        auto_applied_count: job.auto_applied_count,
        manual_review_count: job.manual_review_count,
        failed_count: job.failed_count,
        error_message: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error checking job status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
