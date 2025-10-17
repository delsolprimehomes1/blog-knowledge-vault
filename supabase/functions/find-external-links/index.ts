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
    const { content, headline, language = 'es', requireGovernmentSource = false } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Language-specific configurations
    const languageConfig: Record<string, {
      instruction: string;
      domains: string[];
      sources: string[];
      languageName: string;
      exampleDomain: string;
    }> = {
      es: {
        instruction: 'Find 3-5 authoritative sources for this Spanish real estate article',
        domains: ['.gob.es', '.es official domains'],
        sources: ['Spanish government ministries (Ministerios)', 'Property registry (Registradores de España)', 'Financial sources (Banco de España)', 'Legal and regulatory sources'],
        languageName: 'Spanish',
        exampleDomain: 'https://www.inclusion.gob.es/...'
      },
      en: {
        instruction: 'Find 3-5 authoritative sources for this English real estate article',
        domains: ['.gov', '.gov.uk', '.org official domains'],
        sources: ['Government housing agencies', 'Property registries', 'Financial authorities (SEC, Federal Reserve)', 'Legal and regulatory sources'],
        languageName: 'English',
        exampleDomain: 'https://www.hud.gov/...'
      },
      nl: {
        instruction: 'Find 3-5 authoritative sources for this Dutch real estate article',
        domains: ['.nl', '.overheid.nl', '.gov.nl official domains'],
        sources: ['Dutch government sources (Nederlandse overheid)', 'Land registry (Kadaster)', 'Financial authorities (De Nederlandsche Bank)', 'Legal and regulatory sources'],
        languageName: 'Dutch',
        exampleDomain: 'https://www.kadaster.nl/...'
      }
    };

    const config = languageConfig[language] || languageConfig.es;

    const governmentRequirement = requireGovernmentSource 
      ? `\n\nMANDATORY: At least ONE source MUST be from an official government domain (${config.domains.join(' or ')}). This is non-negotiable and CRITICAL for article validation.`
      : '';

    const prompt = `${config.instruction}:

Article Topic: "${headline}"
Article Language: ${config.languageName}
Content Preview: ${content.substring(0, 2000)}

CRITICAL REQUIREMENTS:
- Prioritize official government sources (${config.domains.join(', ')})
- Include these types of sources: ${config.sources.join(', ')}
- ALL sources MUST be in ${config.languageName} language (no translations, no foreign sites)
- ALL sources must be HTTPS and currently active
- Sources must be DIRECTLY RELEVANT to the article topic: "${headline}"
- Authoritative sources only (government, educational, major institutions)
- For each source, identify WHERE in the article it should be cited${governmentRequirement}

Return ONLY valid JSON in this exact format:
[
  {
    "sourceName": "Example Government Agency",
    "url": "${config.exampleDomain}",
    "anchorText": "official regulatory procedures",
    "contextInArticle": "When discussing legal requirements",
    "insertAfterHeading": "Legal Requirements",
    "relevance": "Authoritative government source providing official data on [specific topic]"
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
            content: `You are a research expert finding authoritative ${config.languageName}-language sources for real estate articles. Always prioritize official government sources. Return only valid JSON arrays. ALL sources must be in ${config.languageName}.`
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

    // Check if government source requirement is met
    if (requireGovernmentSource) {
      const hasGovSource = validCitations.some(c => 
        c.url.includes('.gov') || c.url.includes('.gob.es') || c.url.includes('.overheid.nl')
      );
      
      if (!hasGovSource) {
        console.error('No government source found despite requirement');
        throw new Error('Failed to find required government source. Please try again or uncheck the requirement to search without this restriction.');
      }
      
      console.log('✓ Government source requirement satisfied');
    }

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
