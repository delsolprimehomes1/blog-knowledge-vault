import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Citation {
  sourceName: string;
  url: string;
  anchorText: string;
  contextInArticle: string;
  insertAfterHeading?: string;
  relevance: string;
  verified?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const prompt = `Find 3-5 authoritative sources for this Spanish real estate article:

Article: "${headline}"
Content: ${content.substring(0, 2000)}

REQUIREMENTS:
- Prioritize official Spanish government sources (.gob.es, .es official domains)
- Include property registry (registradores.org)
- Include financial sources (Banco de España)
- Include legal and regulatory sources
- All sources must be HTTPS and currently active
- For each source, identify WHERE in the article it should be cited

Return ONLY valid JSON in this exact format:
[
  {
    "sourceName": "Spanish Ministry of Inclusion",
    "url": "https://www.inclusion.gob.es/...",
    "anchorText": "official NIE application procedures",
    "contextInArticle": "When discussing NIE requirements for foreign buyers",
    "insertAfterHeading": "Legal Requirements",
    "relevance": "Authoritative government source for NIE procedures"
  }
]

Return only the JSON array, nothing else.`;

    console.log('Calling Perplexity API to find authoritative sources...');
    
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
            content: 'You are a research expert finding authoritative sources for real estate articles. Always prioritize official government sources. Return only valid JSON arrays.'
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
    
    let citations: Citation[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        citations = JSON.parse(jsonMatch[0]);
      } else {
        citations = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse citations JSON:', parseError);
      throw new Error('Failed to parse AI response into citations');
    }

    if (!Array.isArray(citations) || citations.length === 0) {
      console.error('No valid citations found in response');
      throw new Error('No citations found');
    }

    console.log(`Found ${citations.length} citations, verifying URLs...`);

    // Verify each URL is accessible
    const verifiedCitations = await Promise.all(
      citations.map(async (citation: Citation) => {
        try {
          const checkResponse = await fetch(citation.url, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          return { 
            ...citation, 
            verified: checkResponse.status === 200 || checkResponse.status === 403
          };
        } catch (error) {
          console.error(`Failed to verify URL ${citation.url}:`, error);
          return { ...citation, verified: false };
        }
      })
    );

    const validCitations = verifiedCitations.filter(c => c.verified);
    console.log(`${validCitations.length} citations verified successfully`);

    return new Response(
      JSON.stringify({ 
        citations: validCitations,
        totalFound: citations.length,
        totalVerified: validCitations.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in find-external-links function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to find external links',
        citations: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
