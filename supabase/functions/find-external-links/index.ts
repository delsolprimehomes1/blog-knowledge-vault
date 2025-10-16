import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Citation {
  sourceName: string;
  url: string;
  anchorText: string;
  relevance: string;
  verified?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const prompt = `Find 3-5 authoritative sources for this Spanish real estate article.

Article: "${headline}"
Content: ${content.substring(0, 1500)}

REQUIREMENTS:
- Prioritize official Spanish government sources (.gob.es, .es)
- Include financial regulatory sources (Banco de España, registradores.org)
- Include property registry and legal sources
- All sources must be HTTPS and currently active
- Provide descriptive anchor text for each link that fits naturally in content

Return ONLY a valid JSON array in this exact format:
[
  {
    "sourceName": "Spanish Ministry of Inclusion",
    "url": "https://www.inclusion.gob.es/...",
    "anchorText": "official NIE application procedures",
    "relevance": "Covers legal requirements for non-residents"
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
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a research expert finding authoritative sources for real estate content. Always verify sources are official and active. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for factual accuracy
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
    
    // Parse JSON from response
    let citations: Citation[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        citations = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response as JSON
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
            verified: checkResponse.status === 200 || checkResponse.status === 403 // 403 means site exists but blocks HEAD requests
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
