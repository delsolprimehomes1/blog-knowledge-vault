import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { TOP_20_PRIORITY_DOMAINS } from '../shared/priorityDomains.ts';
import { isApprovedDomain, getDomainCategory } from '../shared/approvedDomains.ts';
import { 
  getArticleUsedDomains, 
  getRecentlyUsedDomains,
  getUnderutilizedDomains,
  filterAndPrioritizeDomains,
  extractDomain
} from '../shared/domainRotation.ts';

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
      articleId,
      content, 
      headline, 
      language = 'en', 
      requireGovernmentSource = false,
      funnelStage = 'MOFU',
      speakableContext,
      minAuthorityScore,
      focusArea,
      currentCitations = []
    } = await req.json();
    
    console.log(`📝 Request articleId: ${articleId || 'NOT PROVIDED'}`);
    console.log(`📊 Current article has ${currentCitations.length} existing citations`);
    
    // Dynamic authority score threshold based on funnel stage
    // TOFU: 35+ (accepts regional news, tourism sources, travel blogs)
    // MOFU: 45+ (accepts established regional news like SUR, Euro Weekly News)
    // BOFU: 55+ (requires high authority sources for conversion content)
    const defaultMinScores = { TOFU: 35, MOFU: 45, BOFU: 55 };
    const effectiveMinScore = minAuthorityScore ?? defaultMinScores[funnelStage as keyof typeof defaultMinScores] ?? 35;
    
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
    
    // Initialize Supabase client for domain tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Import approved domains
    const { getAllApprovedDomains } = await import('../shared/approvedDomains.ts');
    const allApprovedDomains = getAllApprovedDomains();
    console.log(`✅ Total approved domains: ${allApprovedDomains.length}`);
    
    // Get domain rotation data if articleId is provided
    let prioritizedDomains = allApprovedDomains;
    let usedInArticle: string[] = [];
    let recentlyUsed: string[] = [];
    
    if (articleId) {
      [usedInArticle, recentlyUsed] = await Promise.all([
        getArticleUsedDomains(supabaseClient, articleId),
        getRecentlyUsedDomains(supabaseClient, articleId, 5)
      ]);

      const underutilized = await getUnderutilizedDomains(supabaseClient, 100);
      
      // Prioritize fresh domains
      prioritizedDomains = filterAndPrioritizeDomains(
        allApprovedDomains,
        usedInArticle,
        recentlyUsed,
        underutilized
      );

      console.log(`🔄 Domain rotation: ${usedInArticle.length} used in article, ${recentlyUsed.length} recently used, prioritizing ${prioritizedDomains.slice(0, 20).length} fresh domains`);
    }
    
    const { findBetterCitationsWithBatch } = await import('../shared/citationFinder.ts');
    
    const result = await findBetterCitationsWithBatch(
      headline,
      language,
      content,
      funnelStage as 'TOFU' | 'MOFU' | 'BOFU',
      PERPLEXITY_API_KEY,
      focusArea || 'Costa del Sol real estate',
      speakableContext,
      prioritizedDomains,
      currentCitations
    );

    if (result.status === 'failed' || result.citations.length === 0) {
      console.error(`❌ Batch citation system failed - no citations found`);
      throw new Error('No citations found from batch system');
    }

    console.log(`✅ Found ${result.citations.length} citations from ${result.category} batch`);

    // Filter out citations already used in article and recently used domains
    let rotationFilteredCitations = result.citations;
    if (articleId) {
      const usedUrls = new Set([...currentCitations, ...usedInArticle.map(d => `https://${d}`)]);
      const recentDomainSet = new Set(recentlyUsed);
      
      rotationFilteredCitations = result.citations.filter((citation: any) => {
        const domain = extractDomain(citation.url);
        return !usedUrls.has(citation.url) && !recentDomainSet.has(domain);
      });

      if (rotationFilteredCitations.length < result.citations.length) {
        console.log(`📊 Domain rotation filtered ${result.citations.length} → ${rotationFilteredCitations.length} citations (removed duplicates and recent domains)`);
      }
    }

    // Transform to expected format
    const citations = rotationFilteredCitations.map((c: any) => ({
      sourceName: c.sourceName,
      url: c.url,
      anchorText: c.suggestedContext || c.description.substring(0, 50),
      contextInArticle: c.suggestedContext,
      relevance: c.relevance,
      verified: true
    }));

    // Deduplicate by URL (in case batch system returns duplicates)
    const uniqueCitations = Array.from(
      new Map(citations.map((c: Citation) => [c.url, c])).values()
    );

    if (citations.length > uniqueCitations.length) {
      console.log(`🔄 Deduplicated ${citations.length} → ${uniqueCitations.length} unique URLs`);
      console.log(`   Removed ${citations.length - uniqueCitations.length} duplicate URLs`);
    }

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

    // Domain filtering already done by batch system - use deduplicated citations
    const domainFilteredCitations = uniqueCitations;

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

    // ✅ ENHANCED AUTHORITY SCORING (0-100 scale) - Prioritize high-quality sources
    const citationsWithScores = validCitations.map((citation: any) => {
      let authorityScore = 30; // Higher baseline for verified sources
      const urlLower = citation.url.toLowerCase();
      
      // Government/official sources (highest authority) +40 points
      if (isGovernmentDomain(citation.url)) authorityScore += 40;
      
      // Domain authority indicators
      if (citation.url.includes('.edu')) authorityScore += 25;
      if (citation.url.includes('.org')) authorityScore += 15;
      
      // Top-tier official sources +20 points
      const topTier = ['boe.es', 'registradores', 'notariado', 'europa.eu', 'gov.uk', 'juntadeandalucia.es', 'ine.es', 'bde.es'];
      if (topTier.some(domain => urlLower.includes(domain))) authorityScore += 20;
      
      // Regional news sources (Costa del Sol focus) +15 points
      const regionalNews = [
        'euroweeklynews.com', 'surinenglish.com', 'theolivepress.es',
        'costadelsol.news', 'andalucia.com', 'malagahoy.es',
        'diariosur.es', 'laopiniondemalaga.es', 'malagaes.com'
      ];
      if (regionalNews.some(domain => urlLower.includes(domain))) {
        authorityScore += 15;
        console.log(`✨ Regional news boost: ${citation.sourceName} (+15)`);
      }
      
      // Tourism authorities +10 points
      if (urlLower.includes('turismo') || urlLower.includes('tourism') || urlLower.includes('tourist')) {
        authorityScore += 10;
        console.log(`🏖️ Tourism authority boost: ${citation.sourceName} (+10)`);
      }
      
      // Source name credibility
      const sourceLower = citation.sourceName.toLowerCase();
      if (sourceLower.includes('official')) authorityScore += 10;
      if (sourceLower.includes('government') || sourceLower.includes('ministry')) authorityScore += 15;
      if (sourceLower.includes('university') || sourceLower.includes('research')) authorityScore += 10;
      
      return {
        ...citation,
        authorityScore: Math.min(authorityScore, 100), // Cap at 100
        authorityTier: authorityScore >= 70 ? 'High' : authorityScore >= 50 ? 'Medium' : 'Low'
      };
    });

    // ✅ AGGRESSIVE FILTERING: Apply minimum authority score (now dynamic by funnel stage)
    console.log(`\n📊 Authority Score Breakdown (${funnelStage} threshold: ${effectiveMinScore}):`);
    citationsWithScores.forEach((c: any) => {
      const passSymbol = c.authorityScore >= effectiveMinScore ? '✅' : '❌';
      const reason = c.authorityScore < effectiveMinScore ? ` (Below ${funnelStage} threshold)` : ' (Passes threshold)';
      console.log(`  ${passSymbol} ${c.sourceName}: ${c.authorityScore}/100 (${c.authorityTier})${reason}`);
    });
    
    let filteredCitations = citationsWithScores;
    if (effectiveMinScore > 0) {
      filteredCitations = citationsWithScores.filter(c => c.authorityScore >= effectiveMinScore);
      console.log(`\n🎯 Filtered to ${filteredCitations.length}/${citationsWithScores.length} citations with score >= ${effectiveMinScore} (${funnelStage} threshold)`);
    }

    // ✅ PRIORITIZE GOVERNMENT SOURCES if required
    if (requireGovernmentSource) {
      const govCitations = filteredCitations.filter(c => isGovernmentDomain(c.url));
      const nonGovCitations = filteredCitations.filter(c => !isGovernmentDomain(c.url));
      
      // Put government sources first
      filteredCitations = [...govCitations, ...nonGovCitations];
      console.log(`📊 Government sources: ${govCitations.length}, Others: ${nonGovCitations.length}`);
    }

    // Sort by authority score (highest first)
    filteredCitations.sort((a: any, b: any) => b.authorityScore - a.authorityScore);
    
    console.log(`Authority scores: ${filteredCitations.slice(0, 5).map((c: any) => `${c.sourceName}: ${c.authorityScore}/100 (${c.authorityTier})`).join(', ')}`);

    // If we have some high-quality citations, use them
    // Fallback logic only if minimum authority allows it
    if (filteredCitations.length < 2 && effectiveMinScore === 0) {
      console.warn(`⚠️ Only found ${filteredCitations.length} citations (target: 2+)`);
      
      // Get unverified citations from approved domains as fallback
      const unverifiedCitations = domainFilteredCitations
        .filter(c => !filteredCitations.some(v => v.url === c.url))
        .map((citation: any) => ({
          ...citation,
          verified: false,
          authorityScore: 25, // Lower baseline for unverified
          authorityTier: 'Low'
        }));
      
      if (filteredCitations.length === 0 && unverifiedCitations.length >= 2) {
        console.log(`📝 Using ${Math.min(5, unverifiedCitations.length)} unverified citations as fallback`);
        filteredCitations.push(...unverifiedCitations.slice(0, 5));
      } else if (filteredCitations.length === 1 && unverifiedCitations.length > 0) {
        const additionalCitations = unverifiedCitations.slice(0, 4);
        filteredCitations.push(...additionalCitations);
        console.log(`📝 Mixed ${1} verified + ${additionalCitations.length} unverified citations`);
      }
    }

    // Only throw error if we have absolutely no citations (or none meeting min score)
    if (filteredCitations.length === 0) {
      const reason = effectiveMinScore > 0 
        ? `No citations found with authority score >= ${effectiveMinScore} (${funnelStage} threshold)`
        : 'Could not find any citations from approved domains';
      console.error(`❌ ${reason}`);
      throw new Error(reason);
    }

    console.log(`✅ Returning ${filteredCitations.length} citations (verified: ${filteredCitations.filter((c: any) => c.verified !== false).length}, avg score: ${Math.round(filteredCitations.reduce((sum, c) => sum + c.authorityScore, 0) / filteredCitations.length)}/100)`);

    // Check if government source is present
    const hasGovSource = filteredCitations.some((c: any) => isGovernmentDomain(c.url));
    
    if (requireGovernmentSource && !hasGovSource) {
      console.warn('⚠️ No government source found (requirement enabled but not blocking results)');
    } else if (hasGovSource) {
      console.log('✓ Government source found');
    }

    return new Response(
      JSON.stringify({ 
        citations: filteredCitations,
        totalFound: citations.length,
        totalVerified: filteredCitations.length,
        hasGovernmentSource: hasGovSource,
        averageAuthorityScore: Math.round(filteredCitations.reduce((acc: number, c: any) => acc + c.authorityScore, 0) / filteredCitations.length),
        minAuthorityScore: effectiveMinScore,
        highTierCount: filteredCitations.filter(c => c.authorityScore >= 70).length,
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
