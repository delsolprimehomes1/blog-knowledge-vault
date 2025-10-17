import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CitationContext {
  claim: string;
  surroundingText: string;
  articleTopic: string;
  language: string;
  index: number;
}

interface Citation {
  sourceName: string;
  url: string;
  relevance: string;
  language: string;
  index: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline, language, category, preferredSourceTypes = [] } = await req.json();

    console.log('Citation replacement request:', { headline, language, category });

    // Extract all [CITATION_NEEDED] markers with context
    const citationContexts = extractCitationContexts(content, headline, language);

    if (citationContexts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          citations: [],
          updatedContent: content,
          message: 'No citations needed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${citationContexts.length} citation markers to replace`);

    // Find citations for each marker using Perplexity
    const citations: Citation[] = [];

    for (const context of citationContexts) {
      try {
        console.log(`Finding citation for: "${context.claim.substring(0, 50)}..."`);
        const citation = await findCitationForClaim(context, language, preferredSourceTypes);
        if (citation) {
          citations.push(citation);
          console.log(`✓ Found: ${citation.sourceName}`);
        } else {
          console.log(`✗ No citation found for claim`);
        }
      } catch (error) {
        console.error('Error finding citation:', error);
      }
    }

    // Replace [CITATION_NEEDED] markers with actual citations
    const updatedContent = replaceCitationMarkers(content, citations);

    console.log(`Replaced ${citations.length} of ${citationContexts.length} markers`);

    return new Response(
      JSON.stringify({
        success: true,
        citations,
        updatedContent,
        totalMarkers: citationContexts.length,
        replacedCount: citations.length,
        failedCount: citationContexts.length - citations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in replace-citation-markers:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractCitationContexts(
  content: string, 
  headline: string,
  language: string
): CitationContext[] {
  const contexts: CitationContext[] = [];
  
  // Split content into sentences (handle HTML)
  const withoutTags = content.replace(/<[^>]+>/g, ' ');
  const sentences = withoutTags.split(/(?<=[.!?])\s+/);
  
  let markerIndex = 0;
  sentences.forEach((sentence, index) => {
    if (sentence.includes('[CITATION_NEEDED]')) {
      // Get surrounding context (2 sentences before and after)
      const start = Math.max(0, index - 2);
      const end = Math.min(sentences.length, index + 3);
      const surroundingText = sentences.slice(start, end).join(' ');
      
      // Extract the actual claim (text before [CITATION_NEEDED])
      const claim = sentence
        .replace('[CITATION_NEEDED]', '')
        .trim();
      
      contexts.push({
        claim,
        surroundingText: surroundingText.replace(/\[CITATION_NEEDED\]/g, ''),
        articleTopic: headline,
        language,
        index: markerIndex++
      });
    }
  });
  
  return contexts;
}

async function findCitationForClaim(
  context: CitationContext,
  language: string,
  preferredSourceTypes: string[] = []
): Promise<Citation | null> {
  
  const languageInstructions: Record<string, string> = {
    'en': 'Find English-language sources only (.com, .org, .uk, .gov)',
    'es': 'Find Spanish-language sources only (.es, .gob.es, Spanish sites)',
    'de': 'Find German-language sources only (.de, German sites)',
    'nl': 'Find Dutch-language sources only (.nl, Dutch sites)',
    'fr': 'Find French-language sources only (.fr, French sites)',
    'pl': 'Find Polish-language sources only (.pl, Polish sites)',
    'sv': 'Find Swedish-language sources only (.se, Swedish sites)',
    'da': 'Find Danish-language sources only (.dk, Danish sites)',
    'hu': 'Find Hungarian-language sources only (.hu, Hungarian sites)',
  };

  const sourcePreferenceText = preferredSourceTypes.length > 0 
    ? `\n- PRIORITIZE these source types (in order): ${preferredSourceTypes.join(', ')}`
    : '';

  const prompt = `Find ONE authoritative source to cite this claim about "${context.articleTopic}":

CLAIM: "${context.claim}"

CONTEXT: ${context.surroundingText}

REQUIREMENTS:
- ${languageInstructions[language] || 'Find English sources'}
- Prioritize official/government sources (.gov, .gob.es, etc.)${sourcePreferenceText}
- Must be a real, accessible URL (verify it exists)
- Must be directly relevant to the specific claim
- Must be in ${language.toUpperCase()} language

Return ONLY this JSON (no markdown, no explanation):
{
  "sourceName": "Official name of organization/website",
  "url": "https://exact-url-to-source",
  "relevance": "One sentence explaining why this source validates the claim",
  "language": "${language}"
}`;

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: `You are a research expert finding authoritative citations. CRITICAL: Only return sources in ${language.toUpperCase()} language. Verify URLs are real and accessible. Return ONLY valid JSON.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 300
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse JSON response (handle markdown code blocks)
    let jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      console.error('No JSON found in Perplexity response:', aiResponse);
      return null;
    }

    const citation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    // Validate citation structure
    if (!citation.url || !citation.sourceName) {
      console.error('Invalid citation structure:', citation);
      return null;
    }

    // Verify language matches
    if (citation.language !== language) {
      console.warn(`Citation language (${citation.language}) doesn't match article (${language})`);
      // Still allow it if the URL domain matches the language
      const urlMatchesLanguage = checkUrlLanguage(citation.url, language);
      if (!urlMatchesLanguage) {
        return null;
      }
    }

    // Verify URL is accessible
    const urlCheck = await verifyUrl(citation.url);
    if (!urlCheck) {
      console.error(`URL not accessible: ${citation.url}`);
      return null;
    }

    return {
      ...citation,
      index: context.index
    };

  } catch (error) {
    console.error('Perplexity API error:', error);
    return null;
  }
}

function checkUrlLanguage(url: string, language: string): boolean {
  const languageTLDs: Record<string, string[]> = {
    'es': ['.es', '.gob.es', 'spain', 'españa'],
    'en': ['.com', '.org', '.gov', '.uk'],
    'de': ['.de'],
    'nl': ['.nl'],
    'fr': ['.fr'],
    'pl': ['.pl'],
    'sv': ['.se'],
    'da': ['.dk'],
    'hu': ['.hu']
  };

  const expectedTLDs = languageTLDs[language] || [];
  return expectedTLDs.some(tld => url.toLowerCase().includes(tld));
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      redirect: 'follow'
    });
    // Accept 200 (OK) or 403 (Forbidden but exists)
    return response.status === 200 || response.status === 403;
  } catch (error) {
    console.error('URL verification failed:', url, error);
    return false;
  }
}

function replaceCitationMarkers(
  content: string, 
  citations: Citation[]
): string {
  let updatedContent = content;
  
  // Sort citations by index to replace in order
  const sortedCitations = [...citations].sort((a, b) => a.index - b.index);
  
  sortedCitations.forEach((citation) => {
    // Find first unreplaced [CITATION_NEEDED]
    const marker = '[CITATION_NEEDED]';
    const markerIndex = updatedContent.indexOf(marker);
    
    if (markerIndex !== -1) {
      // Create citation link with proper escaping
      const citationLink = ` <a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(citation.sourceName)}">[${escapeHtml(citation.sourceName)}]</a>`;
      
      // Replace marker
      updatedContent = 
        updatedContent.substring(0, markerIndex) + 
        citationLink + 
        updatedContent.substring(markerIndex + marker.length);
    }
  });
  
  return updatedContent;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
