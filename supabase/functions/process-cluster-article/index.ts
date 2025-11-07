import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FAL_KEY = Deno.env.get('FAL_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentJobId } = await req.json();
    
    if (!parentJobId) {
      throw new Error('parentJobId is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`🔍 [Job ${parentJobId}] Looking for pending article chunks...`);

    // Find next pending chunk
    const { data: chunk, error: chunkError } = await supabase
      .from('cluster_article_chunks')
      .select('*')
      .eq('parent_job_id', parentJobId)
      .eq('status', 'pending')
      .order('chunk_number')
      .limit(1)
      .single();

    if (chunkError || !chunk) {
      console.log(`✅ [Job ${parentJobId}] No pending chunks found`);
      return new Response(JSON.stringify({ success: true, message: 'No pending chunks' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📝 [Job ${parentJobId}] Processing chunk ${chunk.chunk_number}...`);

    // Mark chunk as processing
    await supabase
      .from('cluster_article_chunks')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', chunk.id);

    try {
    // Get parent job details
    const { data: job } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', parentJobId)
      .single();

    if (!job) {
      throw new Error('Parent job not found');
    }

    // Get categories and authors
    const { data: categories } = await supabase
      .from('categories')
      .select('*');

    const { data: authors } = await supabase
      .from('authors')
      .select('*');

    const plan = chunk.article_plan;
    const language = job.language;
    
    console.log(`📄 [Job ${parentJobId}] Generating article: "${plan.headline}"`);

    // Helper function for rate limiting
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper for AI calls with retry
    const callAI = async (prompt: string, maxTokens = 2000) => {
      await sleep(1500); // Rate limit prevention
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      return await response.json();
    };

    const article: any = { ...plan };

    // 1. CATEGORY SELECTION
    console.log(`  🏷️ Selecting category...`);
    const validCategoryNames = (categories || []).map(c => c.name);
    const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Article: "${plan.headline}"
Funnel Stage: ${plan.funnel_stage}
Topic: ${job.topic}

Return ONLY the category name exactly as shown above, nothing else.`;

    const categoryData = await callAI(categoryPrompt, 100);
    let selectedCategory = categoryData.choices[0].message.content.trim();
    
    const matchedCategory = categories?.find(c => 
      c.name.toLowerCase() === selectedCategory.toLowerCase()
    );
    article.category = matchedCategory?.name || categories?.[0]?.name || 'General';
    
    // Update timestamp
    await supabase.from('cluster_article_chunks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chunk.id);

    // 2. SEO META TAGS
    console.log(`  🔍 Generating SEO metadata...`);
    const seoPrompt = `Create SEO meta tags for this article:
Headline: "${plan.headline}"
Language: ${language}
Funnel Stage: ${plan.funnel_stage}

Return JSON: {"title": "50-60 chars with main keyword", "description": "140-160 chars with keyword"}`;

    const seoData = await callAI(seoPrompt, 300);
    const seoText = seoData.choices[0].message.content.trim();
    const seoMatch = seoText.match(/\{[\s\S]*\}/);
    const seoMeta = seoMatch ? JSON.parse(seoMatch[0]) : { title: plan.headline.slice(0, 60), description: '' };
    
    article.meta_title = seoMeta.title;
    article.meta_description = seoMeta.description;
    
    // Update timestamp
    await supabase.from('cluster_article_chunks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chunk.id);

    // 3. SPEAKABLE ANSWER
    console.log(`  💬 Generating speakable answer...`);
    const speakablePrompt = `Write a 40-60 word speakable answer for this article in ${language}:
Headline: "${plan.headline}"
Funnel Stage: ${plan.funnel_stage}

Answer the core question directly and concisely.`;

    const speakableData = await callAI(speakablePrompt, 200);
    article.speakable_answer = speakableData.choices[0].message.content.trim();
    
    // Update timestamp
    await supabase.from('cluster_article_chunks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chunk.id);

    // 4. DETAILED CONTENT (1500-2500 words)
    console.log(`  📝 Generating detailed content (1500-2500 words)...`);
    const contentPrompt = `Write comprehensive article content in ${language}:
Headline: "${plan.headline}"
Funnel Stage: ${plan.funnel_stage}
Target: ${job.target_audience}

Requirements:
- 1500-2500 words
- 6-8 H2 sections with descriptive content
- Natural [LINK:anchor text] markers for internal links
- Natural [CITE:source name] markers for citations
- Use HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- NO external URLs or placeholder links
- Write for Costa del Sol real estate market

Return ONLY the HTML content, no meta information.`;

    const contentData = await callAI(contentPrompt, 4000);
    article.detailed_content = contentData.choices[0].message.content.trim();
    
    // Update timestamp
    await supabase.from('cluster_article_chunks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chunk.id);

    // 5. FAQ ENTITIES
    console.log(`  ❓ Generating FAQ entities...`);
    const faqPrompt = `Generate 4-6 FAQ questions and answers in ${language}:
Article: "${plan.headline}"
Funnel Stage: ${plan.funnel_stage}

Return JSON array: [{"question": "...", "answer": "..."}]`;

    const faqData = await callAI(faqPrompt, 1500);
    const faqText = faqData.choices[0].message.content.trim();
    const faqMatch = faqText.match(/\[[\s\S]*\]/);
    article.faq_entities = faqMatch ? JSON.parse(faqMatch[0]) : [];
    
    // Update timestamp
    await supabase.from('cluster_article_chunks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chunk.id);

    // 6. FEATURED IMAGE
    console.log(`  🖼️ Generating featured image...`);
    
    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable is not set');
    }
    
    const imagePrompt = `Professional real estate photography for Costa del Sol: ${plan.headline}. Luxury Mediterranean property, bright natural lighting, high-end marketing photo.`;
    
    const imageResponse = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: 'landscape_16_9',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false
      }),
    });

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      article.featured_image_url = imageData.images[0].url;
      article.featured_image_alt = `${plan.headline} - Costa del Sol Real Estate`;
      article.featured_image_caption = plan.headline;
    }

    // 7. AUTHOR ASSIGNMENT
    if (authors && authors.length > 0) {
      const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
      article.author_id = randomAuthor.id;
    }

    // Set additional fields
    article.status = 'published';
    article.language = language;
    article.date_published = new Date().toISOString();
    article.date_modified = new Date().toISOString();
    article.cluster_id = parentJobId;
    article.cluster_theme = job.topic;
    article.read_time = Math.ceil(article.detailed_content.split(' ').length / 200);

    // Save article to database
    console.log(`  💾 Saving article to database...`);
    const { data: savedArticle, error: saveError } = await supabase
      .from('blog_articles')
      .insert([article])
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save article: ${saveError.message}`);
    }

    // Update chunk as completed
    await supabase
      .from('cluster_article_chunks')
      .update({
        status: 'completed',
        article_data: savedArticle,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', chunk.id);

    console.log(`✅ [Job ${parentJobId}] Chunk ${chunk.chunk_number} completed!`);

    // Check if all chunks are done
    const { data: allChunks } = await supabase
      .from('cluster_article_chunks')
      .select('status')
      .eq('parent_job_id', parentJobId);

    const allCompleted = allChunks?.every(c => c.status === 'completed');

    if (allCompleted) {
      console.log(`🎉 [Job ${parentJobId}] All articles completed!`);
      
      // Get all completed articles
      const { data: completedChunks } = await supabase
        .from('cluster_article_chunks')
        .select('article_data')
        .eq('parent_job_id', parentJobId)
        .eq('status', 'completed')
        .order('chunk_number');

      const articles = completedChunks?.map(c => c.article_data) || [];

      // Update parent job
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
        .eq('id', parentJobId);
    }

    return new Response(JSON.stringify({
      success: true,
      chunkNumber: chunk.chunk_number,
      articleId: savedArticle.id,
      allCompleted
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    } catch (articleError) {
      // Mark chunk as failed
      console.error(`❌ [Job ${parentJobId}] Failed to process chunk ${chunk.id}:`, articleError);
      
      await supabase
        .from('cluster_article_chunks')
        .update({
          status: 'failed',
          error_message: articleError instanceof Error ? articleError.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', chunk.id);
      
      throw articleError;
    }

  } catch (error) {
    console.error('Error in process-cluster-article:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
