import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractCitationContext(content: string, citationUrl: string, maxLength: number = 500): string | null {
  try {
    const urlPattern = citationUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const position = content.search(new RegExp(urlPattern, 'i'));
    
    if (position === -1) {
      const domain = new URL(citationUrl).hostname.replace('www.', '');
      const domainPosition = content.indexOf(domain);
      if (domainPosition === -1) return null;
      return extractParagraph(content, domainPosition, maxLength);
    }
    
    return extractParagraph(content, position, maxLength);
  } catch (error) {
    console.warn('Error extracting citation context:', error);
    return null;
  }
}

function extractParagraph(content: string, position: number, maxLength: number): string {
  const paragraphBreaks = /\n\n|<\/p>|<p>|<h[1-6]>|<\/h[1-6]>/gi;
  let match;
  let lastBreak = 0;
  let nextBreak = content.length;
  
  while ((match = paragraphBreaks.exec(content)) !== null) {
    if (match.index < position) {
      lastBreak = match.index + match[0].length;
    } else if (match.index > position && nextBreak === content.length) {
      nextBreak = match.index;
      break;
    }
  }
  
  let paragraph = content.substring(lastBreak, nextBreak).trim();
  
  if (paragraph.length > maxLength) {
    const start = Math.max(0, position - lastBreak - Math.floor(maxLength / 2));
    const end = Math.min(paragraph.length, start + maxLength);
    paragraph = (start > 0 ? '...' : '') + paragraph.substring(start, end) + (end < paragraph.length ? '...' : '');
  }
  
  return paragraph;
}

function extractParagraphIndex(content: string, citationUrl: string): number | null {
  if (!content || !citationUrl) return null;
  
  const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gs) || [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].includes(citationUrl) || 
        paragraphs[i].includes(`href="${citationUrl}"`)) {
      return i;
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { parentJobId } = await req.json();

    if (!parentJobId) {
      throw new Error('parentJobId is required');
    }

    console.log(`Processing chunk for job ${parentJobId}`);

    // Get next pending chunk
    const { data: chunk, error: chunkError } = await supabaseClient
      .from('citation_replacement_chunks')
      .select('*')
      .eq('parent_job_id', parentJobId)
      .eq('status', 'pending')
      .order('chunk_number', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (chunkError) throw chunkError;

    if (!chunk) {
      console.log('No more pending chunks. Finalizing job.');
      await finalizeJob(supabaseClient, parentJobId);
      return new Response(JSON.stringify({ status: 'all_chunks_complete' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing chunk ${chunk.chunk_number} (${chunk.chunk_size} citations)`);

    // Mark chunk as processing
    await supabaseClient
      .from('citation_replacement_chunks')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', chunk.id);

    // Process citations in this chunk
    const citations = chunk.citations as any[];
    const results = { autoApplied: 0, manualReview: 0, failed: 0 };
    let currentProgress = 0;

    // Heartbeat interval
    const HEARTBEAT_INTERVAL = 30000;
    let lastHeartbeat = Date.now();

    const updateHeartbeat = async () => {
      const now = Date.now();
      if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
        await supabaseClient
          .from('citation_replacement_chunks')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chunk.id);
        lastHeartbeat = now;
      }
    };

    for (const citation of citations) {
      await updateHeartbeat();

      try {
        currentProgress++;

        // Update progress every 5 citations
        if (currentProgress % 5 === 0) {
          await supabaseClient
            .from('citation_replacement_chunks')
            .update({
              progress_current: currentProgress,
              auto_applied_count: results.autoApplied,
              manual_review_count: results.manualReview,
              failed_count: results.failed,
              updated_at: new Date().toISOString()
            })
            .eq('id', chunk.id);
        }

        console.log(`Processing citation: ${citation.url}`);

        // Extract context and paragraph index for tracking
        const citationContext = extractCitationContext(citation.articleContent, citation.url);
        
        // Fetch article to get content for paragraph tracking
        const { data: article } = await supabaseClient
          .from('blog_articles')
          .select('id, detailed_content')
          .eq('id', citation.articleId)
          .single();

        const { data: discoveryResult, error: discoveryError } = await supabaseClient.functions.invoke(
          'discover-better-links',
          {
            body: {
              originalUrl: citation.url,
              articleHeadline: citation.articleHeadline,
              articleContent: citation.articleContent,
              citationContext: citationContext,
              articleLanguage: citation.articleLanguage,
              context: 'Batch replacement',
              mustBeApproved: true
            }
          }
        );

        if (discoveryError || !discoveryResult?.suggestions?.length) {
          console.log('No alternatives found');
          results.failed++;
          continue;
        }

        const bestMatch = discoveryResult.suggestions.find((s: any) => s.verified) || discoveryResult.suggestions[0];
        
        if (!bestMatch.verified) {
          results.failed++;
          continue;
        }

        // Calculate confidence (0-10 scale)
        const relevanceScore = bestMatch.relevanceScore || 75;
        const authorityScore = bestMatch.authorityScore || 7;
        
        let confidenceScore = 5.0;
        if (relevanceScore >= 90 && authorityScore >= 8) confidenceScore = 9.5;
        else if (relevanceScore >= 85 && authorityScore >= 8) confidenceScore = 9.0;
        else if (relevanceScore >= 80 && authorityScore >= 9) confidenceScore = 8.5;
        else if (relevanceScore >= 80 && authorityScore >= 8) confidenceScore = 8.0;
        else if (relevanceScore >= 75 && authorityScore >= 7) confidenceScore = 7.5;

        if (confidenceScore >= 8.0) {
          // Auto-apply high confidence replacements
          const { data: replacement, error: replError } = await supabaseClient
            .from('dead_link_replacements')
            .insert({
              original_url: citation.url,
              original_source: citation.source,
              replacement_url: bestMatch.suggestedUrl,
              replacement_source: bestMatch.sourceName,
              replacement_reason: `Auto-replacement: ${bestMatch.reason}`,
              confidence_score: confidenceScore,
              status: 'approved',
              suggested_by: 'auto',
            })
            .select()
            .single();

          if (replError) {
            console.error('Failed to create replacement record:', replError);
            results.failed++;
          } else {
            const { error: applyError } = await supabaseClient.functions.invoke(
              'apply-citation-replacement',
              {
                body: {
                  replacementIds: [replacement.id],
                  preview: false
                },
              }
            );

            if (applyError) {
              console.error('Failed to apply replacement:', applyError);
              results.failed++;
            } else {
              results.autoApplied++;
              
              // Update paragraph tracking for the new citation URL
              if (article) {
                const paragraphIndex = extractParagraphIndex(article.detailed_content, bestMatch.suggestedUrl);
                if (paragraphIndex !== null) {
                  await supabaseClient
                    .from('citation_usage_tracking')
                    .update({ 
                      context_paragraph_index: paragraphIndex,
                      updated_at: new Date().toISOString()
                    })
                    .eq('article_id', citation.articleId)
                    .eq('citation_url', bestMatch.suggestedUrl);
                }
              }
            }
          }
        } else {
          results.manualReview++;
        }

      } catch (citationError) {
        console.error('Error processing citation:', citationError);
        results.failed++;
      }
    }

    // Mark chunk as completed
    await supabaseClient
      .from('citation_replacement_chunks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_current: chunk.progress_total,
        auto_applied_count: results.autoApplied,
        manual_review_count: results.manualReview,
        failed_count: results.failed,
        updated_at: new Date().toISOString()
      })
      .eq('id', chunk.id);

    console.log(`Chunk ${chunk.chunk_number} completed:`, results);

    // Update parent job progress
    await updateParentJobProgress(supabaseClient, parentJobId);

    // Chain to next chunk (fire and forget)
    supabaseClient.functions.invoke('process-citation-chunk', {
      body: { parentJobId }
    }).catch(err => console.error('Failed to trigger next chunk:', err));

    return new Response(JSON.stringify({ 
      status: 'chunk_completed', 
      chunkNumber: chunk.chunk_number,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in process-citation-chunk:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateParentJobProgress(supabaseClient: any, parentJobId: string) {
  // Get all chunks for this job
  const { data: chunks } = await supabaseClient
    .from('citation_replacement_chunks')
    .select('*')
    .eq('parent_job_id', parentJobId);

  if (!chunks) return;

  const completed = chunks.filter((c: any) => c.status === 'completed').length;
  const failed = chunks.filter((c: any) => c.status === 'failed').length;
  const totalAutoApplied = chunks.reduce((sum: number, c: any) => sum + (c.auto_applied_count || 0), 0);
  const totalManualReview = chunks.reduce((sum: number, c: any) => sum + (c.manual_review_count || 0), 0);
  const totalFailed = chunks.reduce((sum: number, c: any) => sum + (c.failed_count || 0), 0);
  const totalProgress = chunks.reduce((sum: number, c: any) => sum + (c.progress_current || 0), 0);

  await supabaseClient
    .from('citation_replacement_jobs')
    .update({
      completed_chunks: completed,
      failed_chunks: failed,
      auto_applied_count: totalAutoApplied,
      manual_review_count: totalManualReview,
      failed_count: totalFailed,
      progress_current: totalProgress,
      updated_at: new Date().toISOString()
    })
    .eq('id', parentJobId);
}

async function finalizeJob(supabaseClient: any, parentJobId: string) {
  await updateParentJobProgress(supabaseClient, parentJobId);
  
  const { data: job } = await supabaseClient
    .from('citation_replacement_jobs')
    .select('total_chunks, completed_chunks, failed_chunks')
    .eq('id', parentJobId)
    .single();

  if (!job) return;

  const allDone = (job.completed_chunks + job.failed_chunks) >= job.total_chunks;
  
  if (allDone) {
    await supabaseClient
      .from('citation_replacement_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', parentJobId);
    
    console.log(`Job ${parentJobId} finalized as completed`);
  }
}