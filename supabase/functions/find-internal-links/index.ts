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
    const { content, headline, currentArticleId, language = 'en' } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published articles except current one
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, speakable_answer, category, funnel_stage, language')
      .eq('status', 'published')
      .neq('id', currentArticleId)
      .eq('language', language);

    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      throw articlesError;
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ links: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to analyze relevance
    const analysisPrompt = `Analyze this article and find the 8 most relevant internal links from the list below.

Current Article: "${headline}"
Content snippet: ${content.substring(0, 1000)}

Available Articles:
${articles.map((a, i) => `${i+1}. "${a.headline}" (${a.funnel_stage}) - ${a.speakable_answer.substring(0, 100)}`).join('\n')}

For each relevant link, provide:
1. Article number from list (1-based index)
2. Descriptive anchor text (natural, contextual phrase that fits in a sentence)
3. Title attribute (SEO-friendly description)
4. Where in the content to place it (brief context snippet)
5. Relevance score (1-10)

Prioritize:
- High relevance to current topic
- Mix of TOFU (awareness), MOFU (consideration), BOFU (conversion) stages
- Natural anchor text phrases that would fit in a sentence
- Links that add value for readers

You must respond with valid JSON in this exact format:
{
  "links": [
    {
      "articleNumber": 1,
      "anchorText": "natural phrase from article",
      "titleAttribute": "SEO-friendly description",
      "contextSnippet": "brief context",
      "relevanceScore": 9
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert specializing in internal linking strategies. Provide natural, contextual link recommendations in valid JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('Failed to analyze content with AI');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse JSON response
    let suggestions = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { links: [] };
      suggestions = parsed.links || [];
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
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
          targetArticleId: article.id,
          targetUrl: `/blog/${article.slug}`,
          targetHeadline: article.headline,
          funnelStage: article.funnel_stage,
          category: article.category,
          anchorText: suggestion.anchorText,
          titleAttribute: suggestion.titleAttribute,
          contextSnippet: suggestion.contextSnippet || '',
          relevanceScore: suggestion.relevanceScore || 5
        };
      });

    // Sort by relevance
    enrichedLinks.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

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
