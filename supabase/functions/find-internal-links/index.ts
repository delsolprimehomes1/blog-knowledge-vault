import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline, currentArticleId, language = 'en', funnelStage, availableArticles } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    let articles = availableArticles;

    // If no articles provided, fetch from database
    if (!articles || articles.length === 0) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: dbArticles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, speakable_answer, category, funnel_stage, language')
        .eq('status', 'published')
        .neq('id', currentArticleId)
        .eq('language', language);

      if (articlesError) {
        console.error('Error fetching articles:', articlesError);
        throw articlesError;
      }

      articles = dbArticles || [];
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ links: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finding internal links for: ${headline} (${articles.length} available articles)`);

    // Use Perplexity for intelligent link discovery
    const analysisPrompt = `Find the 5-8 most relevant internal links for this article:

Current Article:
Headline: ${headline}
Funnel Stage: ${funnelStage || 'TOFU'}
Content: ${content.substring(0, 2000)}

Available Articles:
${articles.map((a: any, i: number) => 
  `${i+1}. "${a.headline}" (${a.funnel_stage}) - ${a.speakable_answer?.substring(0, 100) || 'No description'}`
).join('\n')}

Requirements:
- Mix of funnel stages (include TOFU, MOFU, BOFU for better content flow)
- High topical relevance
- Natural anchor text phrases that fit contextually
- Identify WHERE in the content to place each link (which section/heading)

Return ONLY valid JSON in this exact format:
{
  "links": [
    {
      "articleNumber": 5,
      "anchorText": "how to apply for your NIE number",
      "contextInArticle": "Before you can purchase property, you'll need legal documentation",
      "insertAfterHeading": "Legal Requirements",
      "relevanceScore": 9
    }
  ]
}`;

    const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert finding relevant internal links for content strategy. Return only valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Perplexity API error:', aiResponse.status, errorText);
      throw new Error('Failed to analyze content with Perplexity');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('Perplexity response:', aiContent);

    // Parse JSON response
    let suggestions = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { links: [] };
      suggestions = parsed.links || [];
    } catch (parseError) {
      console.error('Error parsing Perplexity response:', parseError);
      suggestions = [];
    }

    // Enrich suggestions with full article data
    const enrichedLinks = suggestions
      .filter((suggestion: any) => {
        const index = suggestion.articleNumber - 1;
        return index >= 0 && index < articles.length;
      })
      .map((suggestion: any) => {
        const article = articles[suggestion.articleNumber - 1];
        return {
          text: suggestion.anchorText,
          url: `/blog/${article.slug}`,
          title: article.headline,
          targetArticleId: article.id,
          targetHeadline: article.headline,
          funnelStage: article.funnel_stage,
          category: article.category,
          contextInArticle: suggestion.contextInArticle || '',
          insertAfterHeading: suggestion.insertAfterHeading || '',
          relevanceScore: suggestion.relevanceScore || 5
        };
      });

    // Sort by relevance
    enrichedLinks.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    console.log(`Found ${enrichedLinks.length} internal links`);

    return new Response(
      JSON.stringify({ links: enrichedLinks.slice(0, 8) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-internal-links function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        links: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
