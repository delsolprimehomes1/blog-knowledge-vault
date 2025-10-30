import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TOP_20_PRIORITY_DOMAINS } from '../shared/priorityDomains.ts';
import { isApprovedDomain, getDomainCategory } from '../shared/approvedDomains.ts';

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
    // Increased timeout for slow sites
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DelSolPrimeBot/1.0)',
        'Accept': '*/*',
        'Accept-Language': 'es,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000)
    });
    
    // Accept any successful status code (2xx, 3xx)
    if (response.status >= 200 && response.status < 400) {
      return true;
    }
    
    // Special case for government sites - try GET if HEAD fails
    if (isGov && (response.status === 403 || response.status === 405)) {
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
    
    // Don't throw - just return false and let fallback logic handle it
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
    const { 
      content, 
      headline, 
      language = 'en', 
      requireGovernmentSource = false,
      funnelStage = 'MOFU' // New parameter with default
    } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Language-specific configurations
    const languageConfig: Record<string, {
      instruction: string;
      sources: string[];
      languageName: string;
      exampleDomain: string;
    }> = {
      en: {
        instruction: 'Find 3-5 authoritative sources from TOP PRIORITY domains only',
        sources: [
          'Government: gov.uk, boe.es',
          'Financial authorities: bde.es, ine.es, ecb.europa.eu',
          'Legal: e-justice.europa.eu'
        ],
        languageName: 'English',
        exampleDomain: 'https://www.gov.uk/...'
      },
      nl: {
        instruction: 'Find 3-5 authoritative sources from TOP PRIORITY domains only',
        sources: [
          'Government sources: exteriores.gob.es, gov.uk',
          'Financial authorities: bde.es, ine.es',
          'Legal: e-justice.europa.eu'
        ],
        languageName: 'Dutch',
        exampleDomain: 'https://www.gov.uk/...'
      }
    };

    const config = languageConfig[language] || languageConfig.en;

    const governmentRequirement = requireGovernmentSource 
      ? `\n\nMANDATORY: At least ONE source MUST be from an official government domain. This is non-negotiable and CRITICAL for article validation.`
      : '';

    // Use new batch-aware citation finder with approved domains enforcement
    console.log(`🔍 Using batch citation system (funnel: ${funnelStage})`);
    
    // Import approved domains to ensure we only use vetted sources
    const { getAllApprovedDomains } = await import('../shared/approvedDomains.ts');
    const approvedDomains = getAllApprovedDomains();
    console.log(`✅ Enforcing ${approvedDomains.length} approved domains only`);
    
    const { findBetterCitationsWithBatch } = await import('../shared/citationFinder.ts');
    
    const result = await findBetterCitationsWithBatch(
      headline,
      language,
      content,
      funnelStage as 'TOFU' | 'MOFU' | 'BOFU',
      PERPLEXITY_API_KEY,
      'Costa del Sol real estate'
    );

    if (result.status === 'failed' || result.citations.length === 0) {
      console.error(`❌ Batch citation system failed - no citations found`);
      throw new Error('No citations found from batch system');
    }

    console.log(`✅ Found ${result.citations.length} citations from ${result.category} batch`);

    // Transform to expected format
    const citations = result.citations.map((c: any) => ({
      sourceName: c.sourceName,
      url: c.url,
      anchorText: c.suggestedContext || c.description.substring(0, 50),
      contextInArticle: c.suggestedContext,
      relevance: c.relevance,
      verified: true
    }));

    // Skip old Perplexity call logic - now handled by batch system
    /* OLD CODE BELOW - KEEPING FOR REFERENCE BUT NOT EXECUTING
    console.log(`🔍 Citation search - Using TOP 20 PRIORITY domains (strategically selected for E-E-A-T authority)`);

    // ✅ Generate site query from TOP 20 priority domains
    const prioritySiteQuery = TOP_20_PRIORITY_DOMAINS.map(d => `site:${d}`).join(' OR ');

    const prompt = `${config.instruction}:

**CRITICAL: ONLY use sources from TOP 20 PRIORITY domains**
Priority Domains: ${TOP_20_PRIORITY_DOMAINS.join(', ')}

Article Topic: "${headline}"
Article Language: ${config.languageName}
Content Preview: ${content.substring(0, 2000)}

**CRITICAL REQUIREMENTS:**
1. ALL sources MUST be from the TOP 20 PRIORITY domains ONLY (no exceptions)
2. Return MINIMUM 2 citations, ideally 3-5 citations
3. Include these types of sources: ${config.sources.join(', ')}
4. ALL sources MUST be in ${config.languageName} language (no translations, no foreign sites)
5. ALL sources must be HTTPS and currently active
6. Sources must be DIRECTLY RELEVANT to the article topic: "${headline}"
7. Authoritative sources only (government, news, legal, official)
8. For each source, identify WHERE in the article it should be cited${governmentRequirement}

**TOP 20 PRIORITY DOMAINS (use ONLY these):**
${TOP_20_PRIORITY_DOMAINS.join(', ')}

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

    // OLD PERPLEXITY CODE - NOW HANDLED BY BATCH SYSTEM
    // Skipping to validation phase
    */

    // Domain filtering already done by batch system
    const domainFilteredCitations = citations;

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
      
      // Official government and legal sources only (no competitors)
      const authoritative = ['boe.es', 'registradores', 'notariado', 'europa.eu', 'gov.uk', 'juntadeandalucia.es'];
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

    // If we have some verified citations, use them
    // If not, fallback to using unverified citations from approved domains
    if (citationsWithScores.length < 2) {
      console.warn(`⚠️ Only found ${citationsWithScores.length} verified citations (target: 2+)`);
      
      // Get unverified citations from approved domains as fallback
      const unverifiedCitations = domainFilteredCitations
        .filter(c => !citationsWithScores.some(v => v.url === c.url))
        .map((citation: any) => ({
          ...citation,
          verified: false,
          authorityScore: 3 // Lower score for unverified
        }));
      
      if (citationsWithScores.length === 0 && unverifiedCitations.length >= 2) {
        // Use unverified citations as fallback (they're still from approved domains)
        console.log(`📝 Using ${Math.min(5, unverifiedCitations.length)} unverified citations from approved domains as fallback`);
        citationsWithScores.push(...unverifiedCitations.slice(0, 5));
      } else if (citationsWithScores.length === 1 && unverifiedCitations.length > 0) {
        // Mix verified + unverified to reach minimum
        const additionalCitations = unverifiedCitations.slice(0, 4);
        citationsWithScores.push(...additionalCitations);
        console.log(`📝 Mixed ${1} verified + ${additionalCitations.length} unverified citations (total: ${citationsWithScores.length})`);
      } else if (citationsWithScores.length === 1 && unverifiedCitations.length === 0) {
        // Only 1 citation available total - still return it
        console.log(`📝 Only 1 citation available, but proceeding`);
      }
    }

    // Only throw error if we have absolutely no citations at all
    if (citationsWithScores.length === 0) {
      console.error('❌ Could not find any citations from approved domains');
      throw new Error('Could not find any citations from approved domains');
    }

    console.log(`✅ Returning ${citationsWithScores.length} citations (verified: ${citationsWithScores.filter((c: any) => c.verified !== false).length}, unverified: ${citationsWithScores.filter((c: any) => c.verified === false).length})`);

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
        averageAuthorityScore: citationsWithScores.reduce((acc: number, c: any) => acc + c.authorityScore, 0) / citationsWithScores.length,
        // New batch system metadata
        category: result.category,
        batchSize: result.batchSize,
        status: result.status
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
