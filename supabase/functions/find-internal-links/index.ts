import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'nl': 'Dutch',
    'fr': 'French',
    'de': 'German',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'hu': 'Hungarian'
  };
  return names[code] || 'English';
}

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

    const languageName = getLanguageName(language);

    // Use Perplexity for intelligent link discovery
    const analysisPrompt = `Find the 5-8 most relevant internal links for this ${languageName} article:

Current Article (Language: ${language.toUpperCase()}):
Headline: ${headline}
Funnel Stage: ${funnelStage || 'TOFU'}
Content: ${content.substring(0, 2000)}

Available Articles (ALL in ${language.toUpperCase()}):
${articles.map((a: any, i: number) => 
  `${i+1}. "${a.headline}" (${a.funnel_stage}) - ${a.speakable_answer?.substring(0, 100) || 'No description'}`
).join('\n')}

CRITICAL REQUIREMENTS:
- Return MINIMUM 5 links, ideally 5-8 links
- ALL articles and anchor text MUST be in ${languageName}
- Mix of funnel stages (include TOFU, MOFU, BOFU for better content flow)
- High topical relevance to the current article's topic
- Natural anchor text phrases IN ${languageName} that fit contextually
- Identify WHERE in the content to place each link (which section/heading)
- Only suggest links that add real value to the reader

Return ONLY valid JSON in this exact format:
{
  "links": [
    {
      "articleNumber": 5,
      "anchorText": "[anchor text in ${languageName}]",
      "contextInArticle": "Why this link is relevant here",
      "insertAfterHeading": "Section Name",
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
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an SEO expert finding relevant internal links for ${languageName} content strategy. ALL suggested anchor text MUST be in ${languageName}. Return only valid JSON.`
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
        if (index < 0 || index >= articles.length) return false;
        
        const article = articles[index];
        // Double-check language match (should already be filtered, but extra safety)
        if (article.language !== language) {
          console.warn(`Filtered out mismatched language link: ${article.headline} (${article.language} != ${language})`);
          return false;
        }
        
        return true;
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
          language: article.language,
          contextInArticle: suggestion.contextInArticle || '',
          insertAfterHeading: suggestion.insertAfterHeading || '',
          relevanceScore: suggestion.relevanceScore || 5
        };
      });

    // Sort by relevance
    enrichedLinks.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    // Ensure minimum 5 links (or all available if less)
    const finalLinks = enrichedLinks.slice(0, Math.max(8, enrichedLinks.length));
    
    if (finalLinks.length < 5) {
      console.warn(`Only found ${finalLinks.length} internal links (minimum 5 recommended)`);
    }

    console.log(`Found ${finalLinks.length} internal links`);

    return new Response(
      JSON.stringify({ links: finalLinks }),
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
