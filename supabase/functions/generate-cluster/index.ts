import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating cluster for:', { topic, language, targetAudience, primaryKeyword });

    // STEP 1: Generate cluster structure
    const structurePrompt = `You are an expert SEO content strategist. Generate a detailed content cluster structure for the topic: "${topic}".

Target Audience: ${targetAudience}
Primary Keyword: ${primaryKeyword}
Language: ${language}

Create exactly 6 articles following this funnel structure:
- 3 TOFU (Top of Funnel) articles - Awareness stage, educational content
- 2 MOFU (Middle of Funnel) articles - Consideration stage, comparison and evaluation
- 1 BOFU (Bottom of Funnel) article - Decision stage, conversion-focused

For each article, provide:
1. A compelling, SEO-optimized headline (question or how-to format)
2. Target secondary keyword
3. Brief content outline (3-5 bullet points)
4. Funnel stage (TOFU, MOFU, or BOFU)

Return ONLY a JSON array with this structure:
[
  {
    "headline": "Article headline here",
    "keyword": "target keyword",
    "outline": ["point 1", "point 2", "point 3"],
    "funnelStage": "TOFU"
  }
]`;

    const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: structurePrompt }],
      }),
    });

    if (!structureResponse.ok) {
      throw new Error(`AI gateway error: ${structureResponse.status}`);
    }

    const structureData = await structureResponse.json();
    const structureText = structureData.choices[0].message.content;
    const articleStructures = JSON.parse(structureText.replace(/```json\n?|\n?```/g, ''));

    console.log('Generated structure for', articleStructures.length, 'articles');

    // STEP 2: Generate full content for each article
    const articles = [];
    
    for (let i = 0; i < articleStructures.length; i++) {
      const structure = articleStructures[i];
      
      const contentPrompt = `You are an expert content writer specializing in SEO and real estate. Write a comprehensive article based on this outline:

Headline: ${structure.headline}
Target Keyword: ${structure.keyword}
Funnel Stage: ${structure.funnelStage}
Outline: ${structure.outline.join(', ')}
Language: ${language}
Context: This is part of a content cluster about "${topic}" for ${targetAudience}.

Generate the following in JSON format:
{
  "headline": "Final optimized headline",
  "metaTitle": "SEO meta title (max 60 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "slug": "url-friendly-slug",
  "speakableAnswer": "40-60 word conversational summary for voice assistants",
  "detailedContent": "Full HTML article content, 1500-2500 words, using proper HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>. Include engaging introduction, detailed sections, and actionable conclusion.",
  "featuredImageAlt": "Descriptive alt text for featured image"
}`;

      const contentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: contentPrompt }],
        }),
      });

      const contentData = await contentResponse.json();
      const contentText = contentData.choices[0].message.content;
      const articleContent = JSON.parse(contentText.replace(/```json\n?|\n?```/g, ''));

      articles.push({
        ...articleContent,
        language,
        category: 'Buying Guide', // Default category
        funnel_stage: structure.funnelStage,
        status: 'draft',
        internal_links: [],
        external_citations: [],
        related_article_ids: [],
        cta_article_ids: [],
        faq_entities: [],
        translations: {},
        featured_image_url: '', // Will be generated separately
      });

      console.log(`Article ${i + 1}/${articleStructures.length} generated:`, articleContent.headline);
    }

    // STEP 3: Link articles in funnel progression (TOFU -> MOFU -> BOFU)
    const tofuArticles = articles.filter(a => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter(a => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter(a => a.funnel_stage === 'BOFU');

    // TOFU articles point to MOFU
    tofuArticles.forEach((article, idx) => {
      article.cta_article_ids = mofuArticles.map((_, i) => `mofu-${i}`);
    });

    // MOFU articles point to BOFU
    mofuArticles.forEach((article, idx) => {
      article.cta_article_ids = bofuArticles.map((_, i) => `bofu-${i}`);
    });

    console.log('Cluster generation complete:', {
      total: articles.length,
      tofu: tofuArticles.length,
      mofu: mofuArticles.length,
      bofu: bofuArticles.length,
    });

    return new Response(
      JSON.stringify({ success: true, articles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating cluster:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate cluster'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
