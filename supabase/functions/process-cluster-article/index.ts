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

    // Fetch master prompt from content_settings
    const { data: masterPromptSetting } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', 'master_content_prompt')
      .single();

    const masterPrompt = masterPromptSetting?.setting_value || '';

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

    // Initialize article with ONLY valid fields from plan
    const article: any = {
      slug: plan.slug,
      headline: plan.headline,
      canonical_url: `https://www.delsolhomes.com/blog/${plan.slug}`
    };

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

    // 4. DETAILED CONTENT (1500-2500 words) - Using Master Prompt
    console.log(`  📝 Generating detailed content with master prompt (1500-2500 words)...`);
    
    // Replace variables in master prompt
    let enrichedPrompt = masterPrompt;
    if (masterPrompt) {
      enrichedPrompt = masterPrompt
        .replace(/\{\{headline\}\}/g, plan.headline)
        .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || plan.headline)
        .replace(/\{\{funnelStage\}\}/g, plan.funnelStage)
        .replace(/\{\{language\}\}/g, language)
        .replace(/\{\{targetAudience\}\}/g, job.target_audience);
      
      console.log(`  ✅ Using master prompt (${enrichedPrompt.length} chars)`);
    } else {
      // Fallback if no master prompt
      enrichedPrompt = `Write comprehensive article content in ${language}:
Headline: "${plan.headline}"
Funnel Stage: ${plan.funnelStage}
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
    }

    const contentData = await callAI(enrichedPrompt, 4000);
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

    // 5.5 REAL CITATION FINDING - Replace [CITE:...] markers with real URLs
    console.log(`  🔍 Finding real citations for article...`);
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (PERPLEXITY_API_KEY) {
      const citationMarkers = [...article.detailed_content.matchAll(/\[CITE:([^\]]+)\]/g)];
      
      if (citationMarkers.length > 0) {
        console.log(`    Found ${citationMarkers.length} citation markers, searching approved domains...`);
        
        try {
          // Import citation finder
          const citationFinderModule = await import('./shared/batchedCitationFinder.ts');
          const { findCitationsWithCascade } = citationFinderModule;
          
          // Find real citations using batched domain search
          const citations = await findCitationsWithCascade(
            plan.headline,
            language,
            article.detailed_content.substring(0, 2000), // Preview
            PERPLEXITY_API_KEY,
            Math.min(citationMarkers.length, 8), // Max 8 citations
            plan.funnelStage,
            job.topic
          );
          
          if (citations && citations.length > 0) {
            // Convert to article citation format
            article.external_citations = citations.map((c: any) => ({
              text: c.sourceName,
              url: c.url,
              source: c.sourceName,
              authorityScore: c.authorityScore,
              year: new Date().getFullYear(),
              language: c.language || language
            }));
            
            console.log(`    ✅ Found ${article.external_citations.length} approved citations (avg authority: ${Math.round(citations.reduce((sum: number, c: any) => sum + c.authorityScore, 0) / citations.length)})`);
          } else {
            console.log(`    ⚠️ No citations found, keeping markers`);
            article.external_citations = [];
          }
        } catch (citationError) {
          console.error(`    ❌ Citation finding failed:`, citationError);
          article.external_citations = [];
        }
      } else {
        console.log(`    No citation markers found in content`);
        article.external_citations = [];
      }
    } else {
      console.log(`    ⚠️ PERPLEXITY_API_KEY not set, skipping citation finding`);
      article.external_citations = [];
    }

    // 5.6 REAL INTERNAL LINK FINDING - For article #2 and later
    console.log(`  🔗 Finding internal links within cluster...`);
    
    if (chunk.chunk_number > 1) {
      // Get sibling articles from same cluster
      const { data: clusterSiblings } = await supabase
        .from('cluster_article_chunks')
        .select('article_data')
        .eq('parent_job_id', parentJobId)
        .eq('status', 'completed')
        .neq('chunk_number', chunk.chunk_number);
      
      if (clusterSiblings && clusterSiblings.length > 0) {
        const availableArticles = clusterSiblings
          .map(c => c.article_data)
          .filter(Boolean);
        
        console.log(`    Found ${availableArticles.length} sibling articles to link to`);
        
        try {
          const linkResponse = await supabase.functions.invoke('find-internal-links', {
            body: {
              content: article.detailed_content,
              headline: plan.headline,
              currentArticleId: null,
              language: language,
              funnelStage: plan.funnelStage,
              availableArticles: availableArticles.map((a: any) => ({
                id: a.id,
                slug: a.slug,
                headline: a.headline,
                speakable_answer: a.speakable_answer,
                category: a.category,
                funnel_stage: a.funnel_stage,
                language: a.language
              }))
            }
          });
          
          if (linkResponse.data?.links && linkResponse.data.links.length > 0) {
            article.internal_links = linkResponse.data.links.map((link: any) => ({
              text: link.text,
              url: link.url,
              title: link.title
            }));
            
            console.log(`    ✅ Found ${article.internal_links.length} internal links`);
          } else {
            console.log(`    ⚠️ No internal links found`);
            article.internal_links = [];
          }
        } catch (linkError) {
          console.error(`    ❌ Internal link finding failed:`, linkError);
          article.internal_links = [];
        }
      } else {
        console.log(`    ⚠️ No sibling articles yet for internal linking`);
        article.internal_links = [];
      }
    } else {
      console.log(`    ⚠️ First article, skipping internal links (no siblings yet)`);
      article.internal_links = [];
    }

    // 6. FEATURED IMAGE
    console.log(`  🖼️ Generating featured image...`);
    
    if (!FAL_KEY || typeof FAL_KEY !== 'string') {
      console.log('    ⚠️ FAL_KEY not configured, skipping image generation');
      article.featured_image_url = null;
      article.featured_image_alt = null;
      article.featured_image_caption = null;
    } else {
      try {
        // Clean and validate FAL_KEY (remove newlines, whitespace)
        const cleanFalKey = FAL_KEY.trim().replace(/[\r\n]/g, '');
        const imagePrompt = `Professional real estate photography for Costa del Sol: ${plan.headline}. Luxury Mediterranean property, bright natural lighting, high-end marketing photo.`;
        
        const imageResponse = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${cleanFalKey}`,
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
          console.log('    ✅ Image generated successfully');
        } else {
          console.warn('    ⚠️ Image generation failed, continuing without image');
          article.featured_image_url = null;
        }
      } catch (imageError) {
        console.error('    ❌ Image generation error:', imageError);
        article.featured_image_url = null; // Continue without image
      }
    }

    // 7. AUTHOR ASSIGNMENT
    if (authors && authors.length > 0) {
      const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
      article.author_id = randomAuthor.id;
    }

    // Build article save object with ONLY valid database columns
    const articleToSave = {
      // Core identification
      slug: article.slug,
      headline: article.headline,
      language: language,
      category: article.category,
      funnel_stage: plan.funnelStage,
      
      // SEO
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      canonical_url: article.canonical_url,
      
      // Content
      speakable_answer: article.speakable_answer,
      detailed_content: article.detailed_content,
      
      // Media
      featured_image_url: article.featured_image_url || null,
      featured_image_alt: article.featured_image_alt || null,
      featured_image_caption: article.featured_image_caption || null,
      
      // Structured data
      internal_links: article.internal_links || [],
      external_citations: article.external_citations || [],
      faq_entities: article.faq_entities || [],
      
      // Author & metadata
      author_id: article.author_id,
      status: 'draft', // Admin reviews before publishing
      date_published: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      read_time: Math.ceil((article.detailed_content || '').split(' ').length / 200),
      
      // Cluster info
      cluster_id: parentJobId,
      cluster_theme: job.topic
    };

    // Save article to database
    console.log(`  💾 Saving article to database...`);
    const { data: savedArticle, error: saveError } = await supabase
      .from('blog_articles')
      .insert([articleToSave])
      .select()
      .single();

    if (saveError) {
      // Log detailed error for debugging
      console.error(`❌ Failed to save article:`, {
        error: saveError.message,
        code: saveError.code,
        details: saveError.details,
        hint: saveError.hint,
        articleSlug: article.slug
      });
      
      // If it's a schema error, provide actionable feedback
      if (saveError.message.includes('column') || saveError.message.includes('does not exist')) {
        throw new Error(`Database schema mismatch: ${saveError.message}. Check that articleToSave object only contains valid blog_articles columns.`);
      }
      
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

      // Call backfill function to create funnel progression links
      console.log(`🔗 [Job ${parentJobId}] Backfilling cluster links...`);
      try {
        await supabase.functions.invoke('backfill-cluster-links', {
          body: { jobId: parentJobId }
        });
        console.log(`✅ [Job ${parentJobId}] Cluster links backfilled`);
      } catch (linkError) {
        console.error(`⚠️ [Job ${parentJobId}] Failed to backfill links:`, linkError);
      }

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
