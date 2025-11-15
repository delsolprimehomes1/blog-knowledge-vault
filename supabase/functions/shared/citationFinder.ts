// Advanced Citation Discovery with Perplexity AI
import { getAllApprovedDomains, generateSiteQuery, isApprovedDomain, getDomainCategory } from './approvedDomains.ts';
import { isCompetitor, getCompetitorReason } from './competitorBlacklist.ts';
import { calculateAuthorityScore } from './authorityScoring.ts';

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
 * Select top 20 priority domains based on article context
 * Respects Perplexity API's 20-domain limit while prioritizing high-authority sources
 */
async function selectPriorityDomains(language: string, focusArea?: string): Promise<string[]> {
  const { APPROVED_DOMAINS } = await import('./approvedDomains.ts');
  const priorities: string[] = [];
  
  // 1. Always include top government sources (highest E-E-A-T authority)
  priorities.push(
    ...APPROVED_DOMAINS.government_official.slice(0, 8) // Top 8 government sites
  );
  
  // 2. Add regional/topic-specific news sources
  if (focusArea?.toLowerCase().includes('costa del sol') || 
      focusArea?.toLowerCase().includes('malaga') ||
      focusArea?.toLowerCase().includes('marbella') ||
      focusArea?.toLowerCase().includes('andalucia')) {
    priorities.push(
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'malagaturismo.com'
    );
  } else {
    priorities.push(...APPROVED_DOMAINS.news_media.slice(0, 4));
  }
  
  // 3. Add legal sources (critical for property content)
  priorities.push(...APPROVED_DOMAINS.legal_professional.slice(0, 3));
  
  // 4. Fill remaining slots with banking/finance sources
  const remaining = 20 - priorities.length;
  if (remaining > 0) {
    priorities.push(...APPROVED_DOMAINS.banking.slice(0, remaining));
  }
  
  // Remove duplicates and enforce 20-domain limit
  return [...new Set(priorities)].slice(0, 20);
}

/**
 * Find better, more authoritative citations for an article
 */
/**
 * Deduplicate citations by URL, keeping the one with highest authority score
 * If descriptions differ, they are merged
 */
function deduplicateCitations(citations: any[]): any[] {
  const urlMap = new Map<string, any>();
  
  for (const citation of citations) {
    const existing = urlMap.get(citation.url);
    
    if (!existing || citation.authorityScore > existing.authorityScore) {
      // Keep the citation with the highest authority score
      // Merge descriptions if we're replacing and they differ
      if (existing && existing.description !== citation.description) {
        citation.description = `${existing.description}; ${citation.description}`;
      }
      urlMap.set(citation.url, citation);
    } else if (existing && existing.description !== citation.description) {
      // If we're not replacing, still merge descriptions
      existing.description = `${existing.description}; ${citation.description}`;
    }
  }
  
  return Array.from(urlMap.values());
}

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
  
  // Select top 20 priority domains (Perplexity API limit)
  const prioritizedDomains = await selectPriorityDomains(articleLanguage, focusArea);
  const allApprovedDomains = getAllApprovedDomains();

  console.log(`🔍 Citation search - Using ${prioritizedDomains.length} priority domains (${allApprovedDomains.length} total approved)`);

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
      search_domain_filter: prioritizedDomains, // Limited to 20 for API compliance
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
/**
 * Find better citations using smart batch selection
 * Uses only 1 category batch (max 20 domains) per article
 */
export async function findBetterCitationsWithBatch(
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  funnelStage: 'TOFU' | 'MOFU' | 'BOFU',
  perplexityApiKey: string,
  focusArea?: string,
  speakableContext?: string,
  prioritizedDomains?: string[], // NEW: Fresh domains to prioritize
  currentCitations?: string[] // NEW: Citations to avoid
): Promise<{
  citations: BetterCitation[];
  category: string;
  batchSize: number;
  status: 'success' | 'partial' | 'failed';
}> {
  
  const { selectBestCategoryBatch } = await import('./categorySelector.ts');
  const { generateBatchSiteQuery, validateBatchSize } = await import('./domainBatches.ts');
  
  // Select batch based on topic and funnel stage (for context, not restriction)
  const selection = selectBestCategoryBatch(articleTopic, funnelStage, articleLanguage);
  
  console.log(`🎯 Selected ${selection.category} context (${selection.domains.length} preferred domains)`);
  console.log(`📝 Reasoning: ${selection.reasoning}`);
  
  // ✅ AGGRESSIVE: Request MORE citations than needed for filtering (10 for BOFU, 8 for MOFU)
  const requestCount = funnelStage === 'BOFU' ? 10 : 
                       funnelStage === 'MOFU' ? 8 : 5;
  const targetCitations = funnelStage === 'BOFU' ? 6 : 
                          funnelStage === 'MOFU' ? 5 : 3;
  
  const config = languageConfig[articleLanguage as keyof typeof languageConfig] || languageConfig.es;
  const focusContext = focusArea 
    ? `\n\n**PRIORITY FOCUS:** ${focusArea}\nFind sources specifically related to this aspect first.`
    : '';
  
  // ✅ NEW: Include speakable context for JSON-LD optimization
  const speakableSection = speakableContext 
    ? `\n\n**PRIMARY FOCUS (JSON-LD Speakable):**\n${speakableContext}\n\n⚠️ CRITICAL: Prioritize finding citations that directly support claims in this key section above. This is the most important part of the article for SEO.`
    : '';

  // Use prioritized domains or fall back to selection
  const domainsToUse = prioritizedDomains && prioritizedDomains.length > 0 
    ? prioritizedDomains.slice(0, 20)
    : selection.domains.slice(0, 20);

  // Build avoid list for prompt
  const avoidCitationsText = currentCitations && currentCitations.length > 0
    ? `\n\n**AVOID These URLs (already used):**\n${currentCitations.slice(0, 15).join('\n')}\n\n⚠️ Do NOT suggest any of the above URLs. Find fresh, diverse sources instead.`
    : '';

  console.log(`🎯 Using ${domainsToUse.length} domains (${prioritizedDomains ? 'prioritized fresh' : 'standard selection'})`);

  const prompt = `You are an expert research assistant finding HIGH-AUTHORITY external sources for a ${config.name} language article.

**CRITICAL REQUIREMENTS:**
- You MUST ONLY provide URLs that you ACTUALLY FOUND through web search
- DO NOT invent, generate, or hallucinate URLs under any circumstances
- ONLY use URLs from these approved domains: ${domainsToUse.join(', ')}
- Every URL must be a REAL, ACCESSIBLE page that exists on the internet
- If you cannot find enough real sources, return fewer citations rather than making up URLs
- Focus on ${selection.category} sources
- PRIORITIZE: Fresh domains not recently used, Government (.gov, .gob, .edu), Legal (registradores, notariado), Official Statistics (ine.es, bde.es)
- MAXIMIZE DIVERSITY: Use different domains for each citation when possible

**Article Topic:** "${articleTopic}"
**Funnel Stage:** ${funnelStage} (${funnelStage === 'TOFU' ? 'awareness' : funnelStage === 'MOFU' ? 'consideration' : 'decision'})
**Language Required:** ${config.name}
**Target:** ${requestCount} HIGH-AUTHORITY citations (we'll filter to top ${targetCitations})
${focusContext}
${speakableSection}
${avoidCitationsText}

**Article Preview:**
${articleContent.substring(0, 1500)}

**Quality Requirements:**
✅ MUST be HIGH authority (.gov, .edu, major news, legal, professional associations)
✅ MUST be in ${config.name} language
✅ MUST be highly relevant to Costa del Sol real estate
✅ MUST be accessible (HTTPS, not behind paywalls)
✅ MUST support specific claims in the article
✅ Prefer recent sources (within last 3 years)
✅ Government and official sources are HIGHEST priority

❌ NEVER cite: Property listing portals (Idealista, Kyero, Fotocasa, Pisos.com, etc.)
❌ NEVER cite: Real estate agencies (RE/MAX, Engel & Völkers, Century21, etc.)
❌ NEVER cite: Competitor websites selling properties
❌ NEVER cite: Paywalled or inaccessible content

**Prioritize These Source Types:**
1. Government sources (agenciatributaria.es, boe.es, gov.uk, gob.es, etc.) - HIGHEST AUTHORITY
2. Legal/professional services (lawyers, notaries, registrars, bar associations)
3. Major news outlets (BBC, El País, Reuters, Bloomberg, Financial Times)
4. Official tourism boards (andalucia.org, visitcostadelsol.com)
5. Financial authorities (Bank of Spain, ECB, national banks)
6. Educational institutions (.edu, .ac.uk)
7. Professional associations and non-profits (.org)

**Citation Strategy for ${funnelStage}:**

**Return ONLY valid JSON array in this EXACT format:**
[
  {
    "url": "https://example.domain/...",
    "sourceName": "Official Source Name",
    "description": "Brief description of what this source contains (1-2 sentences)",
    "relevance": "Why this source is relevant to the article topic",
    "authorityScore": 9,
    "language": "${articleLanguage}",
    "suggestedContext": "Where in the article this citation should appear"
  }
]

Return only the JSON array, nothing else.`;

  console.log(`🔍 Requesting ${targetCitations} citations from Perplexity (${selection.category} batch)...`);

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
          content: `You are a citation research expert. CRITICAL: Only return URLs that you actually found through web search. Never invent or hallucinate URLs. Return valid JSON with real, accessible URLs from your search results.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature to reduce hallucinations
      max_tokens: 3000,
      return_citations: true, // Get real citations from Perplexity's search results
      return_images: false,
      // CRITICAL: Only search approved domains (Perplexity limit: 20)
      search_domain_filter: domainsToUse,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    return {
      citations: [],
      category: selection.category,
      batchSize: selection.domains.length,
      status: 'failed'
    };
  }

  const data = await response.json();
  const citationsText = data.choices[0].message.content;

  console.log('Perplexity response:', citationsText.substring(0, 300));

  try {
    const jsonMatch = citationsText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const citations = JSON.parse(jsonMatch[0]) as BetterCitation[];
    console.log(`📥 Received ${citations.length} citations from Perplexity`);

    // FIRST: Filter to only approved domains (safety net)
    console.log(`\n🔍 Step 1: Filtering for approved domains...`);
    const approvedCitations = citations.filter(citation => {
      if (!citation.url || !citation.sourceName || !citation.url.startsWith('http')) {
        return false;
      }
      
      const isApproved = isApprovedDomain(citation.url);
      if (!isApproved) {
        console.log(`❌ BLOCKED (Non-approved): ${citation.url}`);
        return false;
      }
      
      console.log(`✅ Approved: ${citation.sourceName}`);
      return true;
    });

    console.log(`✅ ${approvedCitations.length}/${citations.length} citations are from approved domains`);

    // SECOND: Filter out competitors
    console.log(`\n🔍 Step 2: Filtering out competitors...`);
    const nonCompetitorCitations = approvedCitations.filter(citation => {
      if (isCompetitor(citation.url)) {
        console.log(`❌ BLOCKED (Competitor): ${citation.url} - ${getCompetitorReason(citation.url)}`);
        return false;
      }
      
      console.log(`✅ Passed: ${citation.sourceName}`);
      return true;
    });

    console.log(`✅ ${nonCompetitorCitations.length}/${citations.length} citations passed competitor filter`);

    // Score all citations by authority
    const scoredCitations = nonCompetitorCitations.map(citation => {
      const scores = calculateAuthorityScore({
        url: citation.url,
        sourceName: citation.sourceName,
        description: citation.description,
        isAccessible: true // Will verify later if needed
      });
      
      return {
        ...citation,
        authorityScore: scores.totalScore,
        authorityTier: scores.tier,
        authorityBreakdown: scores
      };
    });

    // Sort by authority score (highest first)
    scoredCitations.sort((a, b) => b.authorityScore - a.authorityScore);

    console.log(`\n📊 Top Citations by Authority Score:`);
    scoredCitations.slice(0, 5).forEach(c => {
      console.log(`   ${c.authorityScore}/100 (${c.authorityTier}) - ${c.sourceName}`);
    });

    const status = scoredCitations.length >= targetCitations ? 'success' : 
                   scoredCitations.length > 0 ? 'partial' : 'failed';

    // Deduplicate citations by URL, keeping the one with highest authority score
    const deduplicatedCitations = deduplicateCitations(scoredCitations);
    
    if (scoredCitations.length > deduplicatedCitations.length) {
      console.log(`🔄 Deduplicated ${scoredCitations.length} → ${deduplicatedCitations.length} unique citations`);
      console.log(`   Removed ${scoredCitations.length - deduplicatedCitations.length} duplicate URLs`);
    }

    console.log(`
📊 Citation Discovery Results:
   Initial: ${citations.length}
   After filtering: ${deduplicatedCitations.length}
   Target: ${targetCitations}
   Status: ${status}
   Category: ${selection.category}
    `);

    return {
      citations: deduplicatedCitations.slice(0, targetCitations),
      category: selection.category,
      batchSize: selection.domains.length,
      status
    };
  } catch (parseError) {
    console.error('Failed to parse citations:', parseError);
    console.error('Raw response:', citationsText);
    return {
      citations: [],
      category: selection.category,
      batchSize: selection.domains.length,
      status: 'failed'
    };
  }
}

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
