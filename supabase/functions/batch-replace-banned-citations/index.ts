import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isCompetitor } from "../shared/competitorBlacklist.ts";

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

    const { articleIds } = await req.json();

    console.log('🔄 Starting chunked batch replacement for banned citations...');

    // Fetch articles with banned citations
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, external_citations, detailed_content, language, slug')
      .eq('status', 'published')
      .not('external_citations', 'is', null)
      .in('id', articleIds || []);

    if (articlesError) throw articlesError;

    // Collect all banned citations across articles
    const allCitations: Array<{
      articleId: string;
      articleHeadline: string;
      articleContent: string;
      articleLanguage: string;
      url: string;
      source: string;
    }> = [];

    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      const bannedCitations = citations.filter(c => isCompetitor(c.url));

      for (const citation of bannedCitations) {
        allCitations.push({
          articleId: article.id,
          articleHeadline: article.headline,
          articleContent: article.detailed_content?.substring(0, 2000) || '',
          articleLanguage: article.language,
          url: citation.url,
          source: citation.source || new URL(citation.url).hostname,
        });
      }
    }

    console.log(`📊 Found ${allCitations.length} total banned citations to process`);

    if (allCitations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          jobId: null,
          message: 'No banned citations found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create parent job
    const { data: job, error: jobError } = await supabase
      .from('citation_replacement_jobs')
      .insert({
        status: 'running',
        progress_total: allCitations.length,
        progress_current: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    console.log(`📦 Created job ${job.id}`);

    // Split into chunks of 25
    const CHUNK_SIZE = 25;
    const chunks: any[] = [];
    
    for (let i = 0; i < allCitations.length; i += CHUNK_SIZE) {
      const chunkCitations = allCitations.slice(i, i + CHUNK_SIZE);
      chunks.push({
        parent_job_id: job.id,
        chunk_number: Math.floor(i / CHUNK_SIZE) + 1,
        chunk_size: chunkCitations.length,
        citations: chunkCitations,
        progress_total: chunkCitations.length,
        status: 'pending',
      });
    }

    // Insert all chunks
    const { error: chunksError } = await supabase
      .from('citation_replacement_chunks')
      .insert(chunks);

    if (chunksError) throw chunksError;

    // Update job with total chunks
    await supabase
      .from('citation_replacement_jobs')
      .update({ 
        total_chunks: chunks.length,
        chunk_size: CHUNK_SIZE,
      })
      .eq('id', job.id);

    console.log(`✅ Created ${chunks.length} chunks`);

    // Trigger first chunk processing (it will chain to the rest)
    supabase.functions.invoke('process-citation-chunk', {
      body: { parentJobId: job.id }
    }).catch(err => console.error('Failed to trigger first chunk:', err));

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        totalCitations: allCitations.length,
        totalChunks: chunks.length,
        message: `Started processing ${allCitations.length} citations in ${chunks.length} chunks`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch-replace-banned-citations:', error);
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
