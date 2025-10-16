import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Generating cluster for:', { topic, language, targetAudience, primaryKeyword });

    // Fetch available authors and categories
    const { data: authors } = await supabase.from('authors').select('*');
    const { data: categories } = await supabase.from('categories').select('*');

    // STEP 1: Generate cluster structure
    const structurePrompt = `You are an expert SEO content strategist for a luxury real estate agency in Costa del Sol, Spain.

Create a content cluster structure for the topic: "${topic}"
Language: ${language}
Target audience: ${targetAudience}
Primary keyword: ${primaryKeyword}

Generate 6 article titles following this funnel structure:
- 3 TOFU (Top of Funnel) - Awareness stage, educational, broad topics (e.g., "What is Costa del Sol Like for...")
- 2 MOFU (Middle of Funnel) - Consideration stage, comparison, detailed guides (e.g., "How to Choose...")
- 1 BOFU (Bottom of Funnel) - Decision stage, action-oriented (e.g., "Complete Guide to Buying...")

Each article must include the location "Costa del Sol" in the headline.

Return ONLY valid JSON:
{
  "articles": [
    {
      "funnelStage": "TOFU",
      "headline": "What is Costa del Sol Like for International Buyers?",
      "targetKeyword": "costa del sol for international buyers",
      "searchIntent": "informational",
      "contentAngle": "Overview of Costa del Sol lifestyle, climate, culture for foreign buyers"
    }
  ]
}`;

    const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an SEO expert specializing in real estate content strategy. Return only valid JSON.' },
          { role: 'user', content: structurePrompt }
        ],
      }),
    });

    if (!structureResponse.ok) throw new Error(`AI gateway error: ${structureResponse.status}`);

    const structureData = await structureResponse.json();
    const structureText = structureData.choices[0].message.content;
    const { articles: articleStructures } = JSON.parse(structureText.replace(/```json\n?|\n?```/g, ''));

    console.log('Generated structure for', articleStructures.length, 'articles');

    // STEP 2: Generate each article with detailed sections
    const articles = [];

    for (let i = 0; i < articleStructures.length; i++) {
      const plan = articleStructures[i];
      const article: any = {
        funnel_stage: plan.funnelStage,
        language,
        status: 'draft',
      };

      console.log(`Generating article ${i + 1}/${articleStructures.length}: ${plan.headline}`);

      // 1. HEADLINE
      article.headline = plan.headline;

      // 2. SLUG
      article.slug = plan.headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // 3. CATEGORY (infer from available categories)
      const categoryKeywords = {
        'buying': ['buy', 'purchase', 'invest', 'acquire'],
        'market': ['market', 'price', 'trend', 'value'],
        'guide': ['guide', 'how to', 'what is', 'complete'],
        'location': ['location', 'area', 'neighborhood', 'where'],
      };
      
      let matchedCategory = 'Buying Guide'; // default
      for (const cat of categories || []) {
        const catName = cat.name.toLowerCase();
        if (categoryKeywords[catName as keyof typeof categoryKeywords]) {
          const keywords = categoryKeywords[catName as keyof typeof categoryKeywords];
          if (keywords.some(kw => plan.headline.toLowerCase().includes(kw))) {
            matchedCategory = cat.name;
            break;
          }
        }
      }
      article.category = matchedCategory;

      // 4. SEO META TAGS
      const seoPrompt = `Create SEO meta tags for this article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Angle: ${plan.contentAngle}
Language: ${language}

Requirements:
- Meta Title: Include primary keyword, location "Costa del Sol", and year 2025
- Max 60 characters (strict limit)
- Meta Description: Compelling summary with CTA
- Max 160 characters (strict limit)
- Include numbers or specific benefits (e.g., "5 steps", "Complete guide", "Expert tips")

Return ONLY valid JSON:
{
  "title": "Title here (max 60 chars)",
  "description": "Description with benefits and CTA (max 160 chars)"
}`;

      const seoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: seoPrompt }],
        }),
      });

      const seoData = await seoResponse.json();
      const seoText = seoData.choices[0].message.content;
      const seoMeta = JSON.parse(seoText.replace(/```json\n?|\n?```/g, ''));
      
      article.meta_title = seoMeta.title;
      article.meta_description = seoMeta.description;
      article.canonical_url = null;

      // 5. SPEAKABLE ANSWER (40-60 words)
      const speakablePrompt = `Write a conversational, action-oriented speakable answer (40-60 words) for:
Headline: ${plan.headline}
Content angle: ${plan.contentAngle}

This will be read by voice assistants. Make it natural and engaging.

Return ONLY the text, no JSON, no formatting.`;

      const speakableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: speakablePrompt }],
        }),
      });

      const speakableData = await speakableResponse.json();
      article.speakable_answer = speakableData.choices[0].message.content.trim();

      // 6. DETAILED CONTENT (1500-2500 words)
      const contentPrompt = `Write a comprehensive ${language} article about:
Headline: ${plan.headline}
Target keyword: ${plan.targetKeyword}
Search intent: ${plan.searchIntent}
Content angle: ${plan.contentAngle}
Funnel stage: ${plan.funnelStage}

Requirements:
- 1500-2500 words
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>
- Include introduction, 5-7 main sections with <h2> headings, conclusion
- Natural keyword integration (don't overuse)
- ${plan.funnelStage === 'TOFU' ? 'Educational and informative tone' : plan.funnelStage === 'MOFU' ? 'Detailed comparison and evaluation' : 'Action-oriented with clear next steps'}
- Include practical examples and actionable insights

Return ONLY the HTML content, no JSON wrapper.`;

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
      article.detailed_content = contentData.choices[0].message.content.trim();

      // 7. FEATURED IMAGE (using existing generate-image function)
      try {
        const imageResponse = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: `Professional luxury real estate photography: ${plan.headline}. Costa del Sol property, Mediterranean architecture, bright natural lighting, high-end interior design, ultra-realistic, 8k resolution`,
            headline: plan.headline,
          },
        });

        if (imageResponse.data?.images?.[0]?.url) {
          article.featured_image_url = imageResponse.data.images[0].url;
          article.featured_image_alt = `${plan.headline} - Costa del Sol luxury property`;
        } else {
          article.featured_image_url = '';
          article.featured_image_alt = '';
        }
      } catch (error) {
        console.error('Image generation failed:', error);
        article.featured_image_url = '';
        article.featured_image_alt = '';
      }

      article.featured_image_caption = null;

      // 8. DIAGRAM (for MOFU/BOFU articles using existing generate-diagram function)
      if (plan.funnelStage !== 'TOFU') {
        try {
          const diagramResponse = await supabase.functions.invoke('generate-diagram', {
            body: {
              articleContent: article.detailed_content,
              headline: plan.headline,
            },
          });

          if (diagramResponse.data?.mermaidCode) {
            article.diagram_url = diagramResponse.data.mermaidCode;
            article.diagram_description = diagramResponse.data.description;
          } else {
            article.diagram_url = null;
            article.diagram_description = null;
          }
        } catch (error) {
          console.error('Diagram generation failed:', error);
          article.diagram_url = null;
          article.diagram_description = null;
        }
      } else {
        article.diagram_url = null;
        article.diagram_description = null;
      }

      // 9. E-E-A-T ATTRIBUTION (select random author for now)
      if (authors && authors.length > 0) {
        const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
        article.author_id = randomAuthor.id;
        article.reviewer_id = authors.length > 1 ? authors.find(a => a.id !== randomAuthor.id)?.id : null;
      } else {
        article.author_id = null;
        article.reviewer_id = null;
      }

      // 10. FAQ ENTITIES (for MOFU/BOFU)
      if (plan.funnelStage !== 'TOFU') {
        const faqPrompt = `Generate 3-5 FAQ entities for this article:
Headline: ${plan.headline}
Content: ${article.detailed_content.substring(0, 500)}...

Return ONLY valid JSON:
{
  "faqs": [
    {
      "question": "Question here?",
      "answer": "Concise answer (2-3 sentences)"
    }
  ]
}`;

        const faqResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: faqPrompt }],
          }),
        });

        const faqData = await faqResponse.json();
        const faqText = faqData.choices[0].message.content;
        const faqResult = JSON.parse(faqText.replace(/```json\n?|\n?```/g, ''));
        article.faq_entities = faqResult.faqs;
      } else {
        article.faq_entities = [];
      }

      // 11. Calculate read time
      const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
      article.read_time = Math.ceil(wordCount / 200);

      // Initialize empty arrays
      article.internal_links = [];
      article.external_citations = [];
      article.related_article_ids = [];
      article.cta_article_ids = [];
      article.translations = {};

      articles.push(article);
      console.log(`Article ${i + 1} complete:`, article.headline, `(${wordCount} words)`);
    }

    // STEP 3: Link articles in funnel progression
    const tofuArticles = articles.filter((a: any) => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter((a: any) => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter((a: any) => a.funnel_stage === 'BOFU');

    // TOFU points to MOFU (use temporary IDs)
    tofuArticles.forEach((article: any, idx: number) => {
      article.cta_article_ids = [];
    });

    // MOFU points to BOFU
    mofuArticles.forEach((article: any, idx: number) => {
      article.cta_article_ids = [];
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
