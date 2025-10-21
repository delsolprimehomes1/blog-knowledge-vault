import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deadUrl, originalSource, language = 'es', articleContext } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const languageConfig: Record<string, { domains: string[]; languageName: string }> = {
      es: { domains: ['.gob.es', '.es'], languageName: 'Spanish' },
      en: { domains: ['.gov', '.gov.uk'], languageName: 'English' },
      nl: { domains: ['.overheid.nl', '.nl'], languageName: 'Dutch' }
    };
    
    const config = languageConfig[language] || languageConfig.es;
    
    const prompt = `The following citation URL is no longer working:
Dead URL: ${deadUrl}
Original Source: ${originalSource}
Article Context: ${articleContext}

Find 2-3 REPLACEMENT URLs that:
1. Cover the SAME topic as the original source
2. Are from authoritative sources (preferably government domains: ${config.domains.join(', ')})
3. Are in ${config.languageName} language
4. Are currently active and accessible
5. Have similar content to what the original source likely provided

Return ONLY valid JSON:
[
  {
    "url": "https://example.gov/...",
    "source": "Official Source Name",
    "relevance": "Explanation of why this replaces the dead link",
    "confidenceScore": 0.95
  }
]`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a research expert finding replacement sources for broken citation links. Return only valid JSON arrays.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    let replacements: any[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      replacements = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse replacements:', parseError);
      throw new Error('Failed to parse AI response');
    }
    
    const verifiedReplacements = await Promise.all(
      replacements.map(async (replacement) => {
        try {
          const checkResponse = await fetch(replacement.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          return {
            ...replacement,
            verified: checkResponse.ok,
            httpStatus: checkResponse.status
          };
        } catch {
          return { ...replacement, verified: false, httpStatus: 0 };
        }
      })
    );
    
    const validReplacements = verifiedReplacements.filter(r => r.verified);
    
    for (const replacement of validReplacements) {
      await supabase
        .from('dead_link_replacements')
        .insert({
          original_url: deadUrl,
          original_source: originalSource,
          replacement_url: replacement.url,
          replacement_source: replacement.source,
          replacement_reason: replacement.relevance,
          confidence_score: replacement.confidenceScore,
          suggested_by: 'auto',
          status: 'suggested'
        });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        replacements: validReplacements,
        totalFound: replacements.length,
        totalVerified: validReplacements.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error finding replacement citations:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
