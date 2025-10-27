import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FAQEntity {
  question: string;
  answer: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Check if articles are provided in the request (single article mode from trigger or batch UI)
    const body = req.method === 'POST' ? await req.json() : {};
    const providedArticles = body.articles;
    const singleArticleMode = body.single_article_mode === true;

    let articles;
    
    if (providedArticles && Array.isArray(providedArticles) && providedArticles.length > 0) {
      // Use provided articles (from trigger or batch UI)
      console.log(`Processing ${providedArticles.length} provided article(s)...`);
      articles = providedArticles;
    } else {
      // Get articles without FAQs (original behavior)
      const { data: fetchedArticles, error: fetchError } = await supabaseClient
        .from('blog_articles')
        .select('id, slug, headline, detailed_content, meta_description, language, funnel_stage, status')
        .eq('status', 'published')
        .or('faq_entities.is.null,faq_entities.eq.[]');

      if (fetchError) throw fetchError;
      
      articles = fetchedArticles || [];
      console.log(`Found ${articles.length} articles without FAQs`);
    }

    const results = {
      total: articles?.length || 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: string; headline: string; error: string }>
    };

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No articles need FAQs',
        summary: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process articles in batches
    for (const article of articles) {
      results.processed++;
      console.log(`[${results.processed}/${results.total}] Generating FAQs for: ${article.headline}`);

      try {
        // Extract first 1000 words of content for context
        const contentPreview = article.detailed_content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .slice(0, 1000)
          .join(' ');

        const prompt = `Generate exactly 1 FAQ that directly answers the main question in this article's title.

Article Details:
- Headline: ${article.headline}
- Description: ${article.meta_description}
- Language: ${article.language}
- Funnel Stage: ${article.funnel_stage}
- Content Preview: ${contentPreview}

Requirements:
- Create 1 question that rephrases the headline as a natural question
- Provide a comprehensive 150-250 word answer optimized for voice assistants and AI reading
- Include specific details from the article
- Match the article's language (${article.language})

Funnel Stage Guidelines:
${article.funnel_stage === 'TOFU' 
  ? '- TOFU: Focus on "What is..." or "Why..." with educational, awareness-building content that helps readers understand the basics'
  : article.funnel_stage === 'MOFU'
  ? '- MOFU: Focus on "How to..." or "What are the differences..." with detailed process explanations and comparisons'
  : '- BOFU: Focus on "Should I..." or "How do I start..." with actionable, decision-oriented guidance'}

Return ONLY valid JSON in this format:
{
  "faq_entities": [
    {"question": "...", "answer": "..."}
  ]
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are an expert FAQ generator. Return only valid JSON with faq_entities array.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const generatedText = aiData.choices[0]?.message?.content || '';
        
        // Parse JSON response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in AI response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const faqEntities: FAQEntity[] = parsed.faq_entities || [];

        // Validate FAQs
        if (faqEntities.length !== 1) {
          throw new Error(`Invalid FAQ count: ${faqEntities.length}. Expected exactly 1.`);
        }

        for (const faq of faqEntities) {
          if (!faq.question || !faq.answer) {
            throw new Error('FAQ missing question or answer');
          }
          const wordCount = faq.answer.split(/\s+/).length;
          if (wordCount < 100 || wordCount > 300) {
            console.warn(`FAQ answer word count ${wordCount} outside 150-250 range`);
          }
        }

        // Update article with FAQs
        const { error: updateError } = await supabaseClient
          .from('blog_articles')
          .update({ faq_entities: faqEntities })
          .eq('id', article.id);

        if (updateError) throw updateError;

        console.log(`✅ Generated ${faqEntities.length} FAQs for article ${article.slug || article.id}`);
        results.successful++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed for ${article.slug || article.id}: ${errorMsg}`);
        results.failed++;
        results.errors.push({
          id: article.id,
          headline: article.headline,
          error: errorMsg
        });
      }

      // Small delay to avoid rate limits (skip for single article mode)
      if (!singleArticleMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n📊 Final Results:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Successful: ${results.successful}`);
    console.log(`   Failed: ${results.failed}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.processed} articles. ${results.successful} successful, ${results.failed} failed.`,
      summary: results,
      errors: results.errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
