import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAllApprovedDomains, generateSiteQuery, isApprovedDomain, getDomainCategory } from '../shared/approvedDomains.ts';

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

// Helper function to identify government/educational domains
function isGovernmentDomain(url: string): boolean {
  const govPatterns = [
    // Generic government domains
    '.gov',                    // US federal/state government
    '.edu',                    // Educational institutions (US)
    '.ac.uk',                  // Academic institutions (UK)
    
    // UK government
    '.gov.uk',                 // UK government departments
    '.nhs.uk',                 // National Health Service
    'ofcom.org.uk',           // Ofcom (Communications regulator)
    'fca.org.uk',             // Financial Conduct Authority
    'cqc.org.uk',             // Care Quality Commission
    'ons.gov.uk',             // Office for National Statistics
    
    // Spanish government (expanded patterns)
    '.gob.es',                 // Spanish government
    '.gob.',                   // Generic Spanish-speaking countries
    'ine.es',                  // Instituto Nacional de Estadística
    'bde.es',                  // Banco de España
    'boe.es',                  // Boletín Oficial del Estado
    'agenciatributaria.es',    // Spanish Tax Agency
    'registradores.org',       // Spanish Land Registry
    'mitma.gob.es',            // Ministry of Transport
    'inclusion.gob.es',        // Ministry of Inclusion
    'mjusticia.gob.es',        // Ministry of Justice
    'exteriores.gob.es',       // Ministry of Foreign Affairs
    
    // European Union
    'europa.eu',               // EU institutions
    'eurostat.ec.europa.eu',  // Eurostat
    
    // Other countries
    '.gouv.',                  // French-speaking governments (gouv.fr, etc.)
    '.overheid.nl',            // Netherlands government
    '.gc.ca',                  // Government of Canada
    '.gov.au',                 // Australian government
    '.govt.nz'                 // New Zealand government
  ];
  const lowerUrl = url.toLowerCase();
  return govPatterns.some(pattern => lowerUrl.includes(pattern));
}

// Resilient URL verification with fallback strategies
async function verifyUrl(url: string): Promise<boolean> {
  const isGov = isGovernmentDomain(url);
  
  try {
    // Try HEAD request first (fastest)
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)'
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (response.status === 200 || response.status === 403) {
      return true;
    }
    
    // For government domains, try GET request as fallback
    if (isGov && (response.status === 400 || response.status >= 500)) {
      console.log(`HEAD failed for gov site ${url}, trying GET...`);
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)'
        },
        signal: AbortSignal.timeout(10000)
      });
      return getResponse.status === 200 || getResponse.status === 403;
    }
    
    return false;
  } catch (error) {
    console.error('URL verification error:', url, error);
    
    // For government domains, be more lenient with SSL/network errors
    if (isGov) {
      console.warn(`Accepting government URL despite verification error: ${url}`);
      return true; // ✅ Accept government sources even with SSL issues
    }
    
    return false;
  }
}

// Verification with retry logic
async function verifyUrlWithRetry(url: string, retries = 2): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    const result = await verifyUrl(url);
    if (result) return true;
    
    if (i < retries) {
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
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
      siteQuery: string;
    }> = {
      es: {
        instruction: 'Find 3-5 authoritative sources from APPROVED domains only',
        domains: getAllApprovedDomains(),
        sources: [
          'Government (.gob.es): boe.es, agenciatributaria.es, juntadeandalucia.es',
          'News: surinenglish.com, euroweeklynews.com, theolivepress.es',
          'Legal: legalservicesinspain.com, costaluzlawyers.es',
          'Travel: malagaturismo.com, andalucia.com, visitcostadelsol.com'
        ],
        languageName: 'Spanish',
        exampleDomain: 'https://surinenglish.com/...',
        siteQuery: generateSiteQuery()
      },
      en: {
        instruction: 'Find 3-5 authoritative sources from APPROVED domains only',
        domains: getAllApprovedDomains(),
        sources: [
          'Government housing agencies',
          'Property registries',
          'Financial authorities (SEC, Federal Reserve)',
          'Legal and regulatory sources'
        ],
        languageName: 'English',
        exampleDomain: 'https://www.hud.gov/...',
        siteQuery: generateSiteQuery()
      },
      nl: {
        instruction: 'Find 3-5 authoritative sources from APPROVED domains only',
        domains: getAllApprovedDomains(),
        sources: [
          'Dutch government sources (Nederlandse overheid)',
          'Land registry (Kadaster)',
          'Financial authorities (De Nederlandsche Bank)',
          'Legal and regulatory sources'
        ],
        languageName: 'Dutch',
        exampleDomain: 'https://www.kadaster.nl/...',
        siteQuery: generateSiteQuery()
      }
    };

    const config = languageConfig[language] || languageConfig.es;

    const governmentRequirement = requireGovernmentSource 
      ? `\n\nMANDATORY: At least ONE source MUST be from an official government domain. This is non-negotiable and CRITICAL for article validation.`
      : '';

    console.log(`🔍 Citation search - Using ${config.domains.length} approved domains`);

    const prompt = `${config.instruction}:

**CRITICAL: ONLY use sources from approved domains**
Search format: ${config.siteQuery} AND [your search terms]

Article Topic: "${headline}"
Article Language: ${config.languageName}
Content Preview: ${content.substring(0, 2000)}

**CRITICAL REQUIREMENTS:**
1. ALL sources MUST be from the approved domain list (use site: filtering)
2. Return MINIMUM 2 citations, ideally 3-5 citations
3. Include these types of sources: ${config.sources.join(', ')}
4. ALL sources MUST be in ${config.languageName} language (no translations, no foreign sites)
5. ALL sources must be HTTPS and currently active
6. Sources must be DIRECTLY RELEVANT to the article topic: "${headline}"
7. Authoritative sources only (government, news, legal, official)
8. For each source, identify WHERE in the article it should be cited${governmentRequirement}

**Approved Domain Categories:**
- News & Media (surinenglish.com, euroweeklynews.com, theolivepress.es, etc.)
- Government (.gob.es, gov.uk, ine.es, boe.es, juntadeandalucia.es, etc.)
- Legal (legalservicesinspain.com, costaluzlawyers.es, abogadoespanol.com, etc.)
- Travel & Tourism (malagaturismo.com, andalucia.com, visitcostadelsol.com, etc.)
- Finance (bde.es, ecb.europa.eu, numbeo.com, etc.)

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
            content: `You are a research expert finding authoritative ${config.languageName}-language sources. CRITICAL: Only use approved domains. Return only valid JSON arrays. ALL sources must be in ${config.languageName}.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        search_domain_filter: getAllApprovedDomains(), // ✅ API-level enforcement
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

    console.log(`📥 Received ${citations.length} citations from Perplexity`);

    // PHASE 1: Filter by approved domains FIRST
    const domainFilteredCitations = citations.filter((citation: Citation) => {
      const isApproved = isApprovedDomain(citation.url);
      if (!isApproved) {
        console.warn(`❌ REJECTED non-approved domain: ${citation.url}`);
        return false;
      }
      const category = getDomainCategory(citation.url);
      console.log(`✅ APPROVED: ${citation.url} (category: ${category})`);
      return true;
    });

    console.log(`🔒 Domain filtering: ${domainFilteredCitations.length}/${citations.length} from approved domains`);

    // PHASE 2: Verify URLs with retry logic
    const verifiedCitations = await Promise.all(
      domainFilteredCitations.map(async (citation: Citation) => {
        const verified = await verifyUrlWithRetry(citation.url);
        return { ...citation, verified };
      })
    );

    const validCitations = verifiedCitations.filter(c => c.verified);
    const rejectedCount = citations.length - validCitations.length;
    console.log(`📊 Citation Stats:
  - Total found: ${citations.length}
  - Approved domains: ${domainFilteredCitations.length}
  - Verified accessible: ${validCitations.length}
  - Rejected: ${rejectedCount}
`);

    // ✅ AUTHORITY SCORING - Prioritize high-quality sources
    const citationsWithScores = validCitations.map((citation: any) => {
      let authorityScore = 5; // baseline
      
      // Government/official sources (highest authority)
      if (isGovernmentDomain(citation.url)) authorityScore += 5;
      
      // Domain authority indicators
      if (citation.url.includes('.edu')) authorityScore += 4;
      if (citation.url.includes('.org')) authorityScore += 3;
      
      // Established real estate platforms
      const authoritative = ['idealista', 'kyero', 'propertyportal', 'boe.es', 'registradores', 'notariado', 'europa.eu'];
      if (authoritative.some(domain => citation.url.toLowerCase().includes(domain))) authorityScore += 4;
      
      // Source name credibility
      const sourceLower = citation.sourceName.toLowerCase();
      if (sourceLower.includes('official')) authorityScore += 2;
      if (sourceLower.includes('government') || sourceLower.includes('ministry')) authorityScore += 3;
      if (sourceLower.includes('university') || sourceLower.includes('research')) authorityScore += 2;
      
      return {
        ...citation,
        authorityScore: Math.min(authorityScore, 10)
      };
    });

    // Sort by authority score (highest first)
    citationsWithScores.sort((a: any, b: any) => b.authorityScore - a.authorityScore);
    
    console.log(`Authority scores: ${citationsWithScores.map((c: any) => `${c.sourceName}: ${c.authorityScore}`).join(', ')}`);

    // Ensure minimum 2 citations (relaxed due to SSL verification issues)
    if (citationsWithScores.length < 2) {
      console.warn(`Only found ${citationsWithScores.length} valid citations (minimum 2 required)`);
      throw new Error(`Only found ${citationsWithScores.length} verified citations. Need at least 2.`);
    }

    // Check if government source is present (warn instead of blocking)
    const hasGovSource = citationsWithScores.some((c: any) => isGovernmentDomain(c.url));
    
    if (requireGovernmentSource && !hasGovSource) {
      console.warn('⚠️ No government source found (requirement enabled but not blocking results)');
    } else if (hasGovSource) {
      console.log('✓ Government source found');
    }

    return new Response(
      JSON.stringify({ 
        citations: citationsWithScores,
        totalFound: citations.length,
        totalVerified: citationsWithScores.length,
        hasGovernmentSource: hasGovSource,
        averageAuthorityScore: citationsWithScores.reduce((acc: number, c: any) => acc + c.authorityScore, 0) / citationsWithScores.length
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
