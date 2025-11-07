import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

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

    // Use retry logic for database query
    const job = await retryWithBackoff(async () => {
      const { data, error } = await supabaseClient
        .from('citation_replacement_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Job not found');
      
      return data;
    });

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
    
    // Return more graceful error with retry info
    return new Response(
      JSON.stringify({ 
        error: error.message,
        retryable: error.message.includes('connection') || error.message.includes('timeout')
      }),
      { 
        status: error.message === 'Job not found' ? 404 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
