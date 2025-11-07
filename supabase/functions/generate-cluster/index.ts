import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to update job progress
async function updateProgress(supabase: any, jobId: string, step: number, message: string, articleNum?: number) {
  await supabase
    .from('cluster_generations')
    .update({
      status: 'generating',
      progress: {
        current_step: step,
        total_steps: 12,
        current_article: articleNum || 0,
        total_articles: 6,
        message
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Sleep utility for rate limit prevention
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main cluster generation coordinator
async function generateCluster(
  jobId: string,
  topic: string,
  language: string,
  targetAudience: string,
  primaryKeyword: string
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    console.log(`[Job ${jobId}] 🚀 Starting cluster generation coordinator`);
    
    await updateProgress(supabase, jobId, 1, 'Generating article structures...');

    // STEP 1: Generate Article Structures
    const structurePrompt = `Create 6 SEO-optimized article headlines for Costa del Sol real estate:
Topic: ${topic}
Language: ${language}
Target Audience: ${targetAudience}
Primary Keyword: ${primaryKeyword}

Distribute across funnel stages:
- 2 TOFU articles (awareness, educational, "how to", "what is")
- 2 MOFU articles (consideration, comparison, "best", "vs", location guides)
- 2 BOFU articles (conversion, transactional, "buy", "sell", specific services)

Return JSON array:
[
  {
    "headline": "Complete headline (55-60 chars)",
    "targetKeyword": "primary keyword phrase",
    "contentAngle": "unique approach",
    "funnelStage": "TOFU|MOFU|BOFU"
  }
]`;

    await sleep(1500);

    const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: structurePrompt }],
        max_tokens: 2000,
        temperature: 0.8
      }),
    });

    if (!structureResponse.ok) {
      throw new Error(`AI API error: ${structureResponse.status}`);
    }

    const structureData = await structureResponse.json();
    const structureText = structureData.choices[0].message.content.trim();
    const jsonMatch = structureText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to extract article structures from AI response');
    }

    const articleStructures = JSON.parse(jsonMatch[0]);
    console.log(`[Job ${jobId}] ✅ Generated ${articleStructures.length} article structures`);

    // Generate slugs for all articles
    const { data: existingSlugs } = await supabase
      .from('blog_articles')
      .select('slug');

    const existingSlugSet = new Set((existingSlugs || []).map(a => a.slug));
    const slugMap = new Map<number, string>();

    for (let i = 0; i < articleStructures.length; i++) {
      const plan = articleStructures[i];
      let baseSlug = plan.headline
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60);

      let uniqueSlug = baseSlug;
      let counter = 1;

      while (existingSlugSet.has(uniqueSlug) || Array.from(slugMap.values()).includes(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      slugMap.set(i, uniqueSlug);
      console.log(`[Job ${jobId}] Article ${i + 1} slug: "${uniqueSlug}"`);
    }

    // STEP 2: Create chunks in database for each article
    console.log(`[Job ${jobId}] 📦 Creating ${articleStructures.length} article chunks...`);
    
    for (let i = 0; i < articleStructures.length; i++) {
      const plan = articleStructures[i];
      
      await supabase
        .from('cluster_article_chunks')
        .insert({
          parent_job_id: jobId,
          chunk_number: i + 1,
          article_plan: {
            headline: plan.headline,
            slug: slugMap.get(i),
            targetKeyword: plan.targetKeyword,
            contentAngle: plan.contentAngle,
            funnelStage: plan.funnelStage
          },
          status: 'pending'
        });
    }

    console.log(`[Job ${jobId}] ✅ Created ${articleStructures.length} chunks`);

    // STEP 3: Process the FIRST article immediately
    console.log(`[Job ${jobId}] 🎯 Processing first article immediately...`);
    await updateProgress(supabase, jobId, 2, 'Generating article 1 of 6...', 1);

    await supabase.functions.invoke('process-cluster-article', {
      body: { parentJobId: jobId }
    });

    console.log(`[Job ${jobId}] ✅ First article triggered, remaining articles will be processed by poll function`);

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Generation failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    await supabase
      .from('cluster_generations')
      .update({
        status: 'failed',
        error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user ID (if authenticated)
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (e) {
        console.log('Could not get user from auth header:', e);
      }
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .insert({
        user_id: userId,
        topic,
        language,
        target_audience: targetAudience,
        primary_keyword: primaryKeyword,
        status: 'pending',
        total_articles: 6
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw jobError;
    }

    console.log(`✅ Created job ${job.id}, starting background generation`);

    // Start generation in background (non-blocking)
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await generateCluster(job.id, topic, language, targetAudience, primaryKeyword);
        } catch (error) {
          console.error(`[Job ${job.id}] 🚨 FATAL ERROR:`, error);
          
          try {
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );
            
            await supabase
              .from('cluster_generations')
              .update({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown fatal error',
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
          } catch (dbError) {
            console.error(`[Job ${job.id}] ❌ Failed to update database after crash:`, dbError);
          }
        }
      })()
    );

    // Return job ID immediately
    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-cluster request handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
