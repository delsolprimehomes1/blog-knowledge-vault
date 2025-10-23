import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BetterLinkSuggestion {
  originalUrl: string;
  suggestedUrl: string;
  sourceName: string;
  relevanceScore: number;
  authorityScore: number;
  reason: string;
  language: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      originalUrl, 
      articleHeadline, 
      articleContent, 
      articleLanguage = 'es',
      context 
    } = await req.json();

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    console.log(`Finding better alternatives for: ${originalUrl}`);

    const languageConfig: Record<string, { name: string; domains: string[] }> = {
      es: { name: 'Spanish', domains: ['.gob.es', '.es'] },
      en: { name: 'English', domains: ['.gov', '.gov.uk', '.edu'] },
      nl: { name: 'Dutch', domains: ['.nl', '.overheid.nl'] },
      de: { name: 'German', domains: ['.de', '.gov.de'] },
    };

    const config = languageConfig[articleLanguage] || languageConfig.es;

    const prompt = `Find 3-5 HIGH-QUALITY alternative sources to replace this broken or irrelevant link.

Original (Broken) Link: ${originalUrl}
Article Topic: "${articleHeadline}"
Context in Article: ${context || 'General reference'}
Language Required: ${config.name}

Article Preview:
${articleContent.substring(0, 1000)}

REQUIREMENTS:
- ALL sources MUST be in ${config.name} language
- Prioritize official government domains (${config.domains.join(', ')})
- Sources must be authoritative (.gov, .edu, .org, official institutions)
- Sources must be currently accessible (HTTPS, active)
- Sources must be HIGHLY RELEVANT to the article topic
- Prefer recent sources (published within last 3 years)

Return ONLY valid JSON array:
[
  {
    "suggestedUrl": "https://example.gob.es/...",
    "sourceName": "Official Source Name",
    "relevanceScore": 95,
    "authorityScore": 9,
    "reason": "Why this source is better than the original",
    "language": "es"
  }
]

Return only the JSON array, nothing else.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
            content: `You are an expert research assistant finding authoritative ${config.name}-language sources. Always prioritize government and educational sources. Return only valid JSON arrays.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Perplexity response:', aiResponse);

    let suggestions: BetterLinkSuggestion[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('No alternative sources found');
    }

    // Verify suggested URLs are accessible
    const verifiedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        try {
          const verifyResponse = await fetch(suggestion.suggestedUrl, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; LinkValidator/1.0)'
            },
            signal: AbortSignal.timeout(8000)
          });
          
          const isAccessible = verifyResponse.ok || verifyResponse.status === 403;
          
          return {
            ...suggestion,
            originalUrl,
            verified: isAccessible,
            statusCode: verifyResponse.status,
          };
        } catch (error) {
          console.warn(`Failed to verify ${suggestion.suggestedUrl}:`, error);
          return {
            ...suggestion,
            originalUrl,
            verified: false,
            statusCode: null,
          };
        }
      })
    );

    // Sort by authority and relevance, prioritize verified links
    verifiedSuggestions.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return (b.authorityScore + b.relevanceScore) - (a.authorityScore + a.relevanceScore);
    });

    console.log(`Found ${verifiedSuggestions.length} alternative sources`);

    return new Response(
      JSON.stringify({
        originalUrl,
        suggestions: verifiedSuggestions,
        totalFound: verifiedSuggestions.length,
        verifiedCount: verifiedSuggestions.filter(s => s.verified).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in discover-better-links:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
