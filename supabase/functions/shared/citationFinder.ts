// Advanced Citation Discovery with Perplexity AI
import { getAllApprovedDomains, generateSiteQuery, isApprovedDomain, getDomainCategory } from './approvedDomains.ts';

export interface BetterCitation {
  url: string;
  sourceName: string;
  description: string;
  relevance: string;
  authorityScore: number;
  language: string;
  suggestedContext: string;
}

const languageConfig = {
  en: {
    name: 'English',
    domains: '.gov, .gov.uk, .edu, .ac.uk, official UK/US government sites',
    examples: 'HM Land Registry, GOV.UK, U.S. Department of Housing'
  },
  es: {
    name: 'Spanish',
    domains: '.gob.es, .es, Spanish government ministries',
    examples: 'Ministerio de Inclusión, BOE, Registradores de España'
  },
  de: {
    name: 'German',
    domains: '.de, .gov.de, German official sites',
    examples: 'German government departments, official registries'
  },
  nl: {
    name: 'Dutch',
    domains: '.nl, .overheid.nl, Dutch government sites',
    examples: 'Kadaster, Nederlandse overheid'
  },
  fr: {
    name: 'French',
    domains: '.gouv.fr, .fr, French government sites',
    examples: 'French ministries, official documentation'
  },
  pl: {
    name: 'Polish',
    domains: '.gov.pl, .pl, Polish government sites',
    examples: 'Polish government departments'
  },
  sv: {
    name: 'Swedish',
    domains: '.se, Swedish government sites',
    examples: 'Swedish authorities'
  },
  da: {
    name: 'Danish',
    domains: '.dk, Danish government sites',
    examples: 'Danish official sources'
  },
  hu: {
    name: 'Hungarian',
    domains: '.hu, Hungarian government sites',
    examples: 'Hungarian official sources'
  },
};

/**
 * Find better, more authoritative citations for an article
 */
export async function findBetterCitations(
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  currentCitations: string[],
  perplexityApiKey: string,
  focusArea?: string // e.g., "Costa del Sol real estate"
): Promise<BetterCitation[]> {
  
  const config = languageConfig[articleLanguage as keyof typeof languageConfig] || languageConfig.es;
  
  const focusContext = focusArea 
    ? `\n**Special Focus:** ${focusArea} - prioritize sources specific to this region/topic`
    : '';

  const currentCitationsText = currentCitations.length > 0
    ? `\n**Current Citations to AVOID duplicating:**\n${currentCitations.slice(0, 10).join('\n')}`
    : '';

  const siteQuery = generateSiteQuery();
  const approvedDomains = getAllApprovedDomains();

  console.log(`🔍 Citation search - Using ${approvedDomains.length} approved domains`);

  const prompt = `You are an expert research assistant finding authoritative external sources for a ${config.name} language article.

**CRITICAL: ONLY use sources from approved domains**
Search format: ${siteQuery} AND [your search terms]

**Article Topic:** "${articleTopic}"
**Language Required:** ${config.name}
**Article Content Preview:**
${articleContent.substring(0, 1000)}
${focusContext}
${currentCitationsText}

**CRITICAL REQUIREMENTS:**
1. ALL sources MUST be from the approved domain list (use site: filtering)
2. ALL sources MUST be in ${config.name} language
3. Sources must be HIGH AUTHORITY (government, news, legal, official)
4. Content must DIRECTLY relate to the article topic
5. Sources must be currently accessible (HTTPS, active)
6. Avoid duplicating current citations listed above
7. Find 5-8 diverse, authoritative sources

**Approved Domain Categories:**
- News & Media (surinenglish.com, euroweeklynews.com, theolivepress.es, etc.)
- Government (.gob.es, gov.uk, ine.es, boe.es, etc.)
- Legal (legalservicesinspain.com, costaluzlawyers.es, etc.)
- Travel & Tourism (malagaturismo.com, andalucia.com, etc.)
- Finance (bde.es, ecb.europa.eu, numbeo.com, etc.)

**Return ONLY valid JSON array in this EXACT format:**
[
  {
    "url": "https://example.gob.es/...",
    "sourceName": "Official Source Name",
    "description": "Brief description of what this source contains (1-2 sentences)",
    "relevance": "Why this source is relevant to the article topic",
    "authorityScore": 9,
    "language": "${articleLanguage}",
    "suggestedContext": "Where in the article this citation should appear (e.g., 'Legal requirements section', 'Market statistics')"
  }
]

Return only the JSON array, nothing else.`;

  console.log('Requesting better citations from Perplexity...');

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
          content: `You are an expert research assistant finding authoritative ${config.name}-language sources. Return ONLY valid JSON arrays. Never duplicate provided citations. CRITICAL: Only use approved domains.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
      search_domain_filter: approvedDomains, // ✅ API-level enforcement
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const citationsText = data.choices[0].message.content;

  console.log('Perplexity response:', citationsText.substring(0, 300));

  try {
    // Extract JSON from response
    const jsonMatch = citationsText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const citations = JSON.parse(jsonMatch[0]) as BetterCitation[];

    console.log(`📥 Received ${citations.length} citations from Perplexity`);

    // Validate and filter citations - ENFORCE APPROVED DOMAINS
    const validCitations = citations.filter(citation => {
      // Basic validation
      if (!citation.url || !citation.sourceName || !citation.url.startsWith('http')) {
        return false;
      }
      
      // Check against current citations
      if (currentCitations.includes(citation.url)) {
        return false;
      }
      
      // CRITICAL: Check if domain is approved
      const isApproved = isApprovedDomain(citation.url);
      if (!isApproved) {
        console.warn(`❌ REJECTED non-approved domain: ${citation.url}`);
        return false;
      }
      
      const category = getDomainCategory(citation.url);
      console.log(`✅ APPROVED: ${citation.url} (category: ${category})`);
      
      return true;
    });

    const rejectedCount = citations.length - validCitations.length;
    console.log(`📊 Citation Stats:
  - Total found: ${citations.length}
  - Approved: ${validCitations.length}
  - Rejected: ${rejectedCount}
`);

    return validCitations;
  } catch (parseError) {
    console.error('Failed to parse citations:', parseError);
    console.error('Raw response:', citationsText);
    throw new Error('Failed to parse citation recommendations');
  }
}

/**
 * Verify that suggested citations are actually accessible
 */
export async function verifyCitations(citations: BetterCitation[]): Promise<BetterCitation[]> {
  console.log(`Verifying ${citations.length} citations...`);

  const verifiedCitations = await Promise.all(
    citations.map(async (citation) => {
      try {
        const response = await fetch(citation.url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CitationValidator/1.0)'
          },
          signal: AbortSignal.timeout(8000)
        });

        const isAccessible = response.ok || response.status === 403;
        
        return {
          ...citation,
          verified: isAccessible,
          statusCode: response.status,
        };
      } catch (error) {
        console.warn(`Failed to verify ${citation.url}:`, error);
        return {
          ...citation,
          verified: false,
          statusCode: null,
        };
      }
    })
  );

  // Sort: verified first, then by authority score
  verifiedCitations.sort((a: any, b: any) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return b.authorityScore - a.authorityScore;
  });

  const verifiedCount = verifiedCitations.filter((c: any) => c.verified).length;
  console.log(`${verifiedCount}/${citations.length} citations verified`);

  return verifiedCitations;
}
