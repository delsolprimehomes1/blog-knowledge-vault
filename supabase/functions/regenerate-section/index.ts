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
    const { articleData, section, clusterTopic } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Regenerating section:', section, 'for article:', articleData.headline);

    let prompt = '';
    let updates = {};

    switch (section) {
      case 'headline':
        prompt = `Generate 3 alternative SEO-optimized headlines for an article about:
Current headline: ${articleData.headline}
Cluster topic: ${clusterTopic}
Funnel stage: ${articleData.funnel_stage}
Language: ${articleData.language}

Return ONLY a JSON object with this structure:
{
  "options": ["headline 1", "headline 2", "headline 3"],
  "recommended": "headline 1"
}`;
        break;

      case 'seo':
        prompt = `Generate optimized SEO meta tags for this article:
Headline: ${articleData.headline}
Content summary: ${articleData.speakable_answer}
Language: ${articleData.language}

Return ONLY a JSON object:
{
  "metaTitle": "Title (max 60 chars)",
  "metaDescription": "Description (max 160 chars)"
}`;
        break;

      case 'image':
        prompt = `Generate a descriptive alt text for a featured image for this article:
Headline: ${articleData.headline}
Topic: ${clusterTopic}

Return ONLY a JSON object:
{
  "featuredImageAlt": "Descriptive alt text here"
}`;
        break;

      case 'content':
        prompt = `Regenerate the detailed content for this article:
Headline: ${articleData.headline}
Current content: ${articleData.detailed_content}
Language: ${articleData.language}
Funnel stage: ${articleData.funnel_stage}

Improve the content with:
- Better structure and flow
- More engaging language
- SEO optimization
- Actionable insights

Return ONLY a JSON object:
{
  "detailedContent": "Full HTML content here with <h2>, <h3>, <p>, <ul>, <li>, <strong> tags"
}`;
        break;

      case 'image_alt':
        prompt = `Generate SEO-optimized alt text for this article's featured image:
Headline: ${articleData.headline}
Target Keyword: ${articleData.meta_title?.split(' ')[0] || ''}
Current alt: ${articleData.featured_image_alt}

Requirements:
- Include primary keyword naturally
- Describe what's visible (Costa del Sol property)
- Max 125 characters
- Descriptive, not keyword-stuffed

Return ONLY JSON: { "featuredImageAlt": "..." }`;
        break;

      case 'speakable':
        prompt = `Regenerate the speakable answer (voice assistant response) for:
Headline: ${articleData.headline}
Current answer: ${articleData.speakable_answer}
Language: ${articleData.language}

Requirements:
- Conversational, natural tone
- 50-80 words
- Directly answers the main question
- Includes key information

Return ONLY JSON: { "speakableAnswer": "..." }`;
        break;

      case 'meta_title':
        prompt = `Generate optimized meta title for this article:
Headline: ${articleData.headline}
Language: ${articleData.language}

Requirements:
- Max 60 characters
- Include primary keyword
- Engaging and click-worthy

Return ONLY JSON: { "metaTitle": "..." }`;
        break;

      case 'meta_description':
        prompt = `Generate optimized meta description for this article:
Headline: ${articleData.headline}
Content summary: ${articleData.speakable_answer}
Language: ${articleData.language}

Requirements:
- Max 160 characters
- Include primary keyword
- Call to action

Return ONLY JSON: { "metaDescription": "..." }`;
        break;

      case 'eeat':
        prompt = `This section requires author data. Return empty suggestions.`;
        break;

      case 'links':
        prompt = `This section requires external link finding. Return empty.`;
        break;

      default:
        throw new Error(`Unknown section: ${section}`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.content[0].text;
    const result = JSON.parse(contentText.replace(/```json\n?|\n?```/g, ''));

    // Extract updates based on section
    if (section === 'headline') {
      updates = { headline: result.recommended };
    } else if (section === 'seo') {
      updates = { 
        meta_title: result.metaTitle,
        meta_description: result.metaDescription 
      };
    } else if (section === 'image') {
      updates = { featured_image_alt: result.featuredImageAlt };
    } else if (section === 'image_alt') {
      updates = { featured_image_alt: result.featuredImageAlt };
    } else if (section === 'speakable') {
      updates = { speakable_answer: result.speakableAnswer };
    } else if (section === 'meta_title') {
      updates = { meta_title: result.metaTitle };
    } else if (section === 'meta_description') {
      updates = { meta_description: result.metaDescription };
    } else if (section === 'content') {
      updates = { detailed_content: result.detailedContent };
    } else if (section === 'eeat' || section === 'links') {
      updates = {}; // Handled differently
    }

    console.log('Section regenerated successfully:', section);

    return new Response(
      JSON.stringify({ success: true, updates }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error regenerating section:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to regenerate section'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
