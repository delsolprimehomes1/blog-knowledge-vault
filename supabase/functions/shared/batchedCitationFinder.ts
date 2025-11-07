/**
 * Batched Citation Finder with Progressive Fallback
 * 
 * Searches approved domains in priority tiers, stopping when target is reached.
 * Ensures ONLY approved domains are cited, never the entire web.
 */

import { getAllApprovedDomains } from "./approvedDomains.ts";
import { isCompetitor } from "./competitorBlacklist.ts";
import { calculateAuthorityScore } from "./authorityScoring.ts";

export interface BetterCitation {
  url: string;
  source: string;
  description: string;
  relevance: string;
  authorityScore: number;
  language: string;
  suggestedContext?: string;
  verified?: boolean;
  batchTier?: string;
}

/**
 * Priority batches - organized by authority level
 */
const DOMAIN_BATCHES = {
  tierS: [
    // Government & Official Tourism (Highest Authority)
    'boe.es', 'agenciatributaria.es', 'exteriores.gob.es', 'juntadeandalucia.es',
    'gov.uk', 'gov.ie', 'spain.info', 'andalucia.org', 'visitcostadelsol.com',
    'cnmc.es', 'ine.es', 'catastro.gob.es', 'mjusticia.gob.es',
    'extranjeria.administracionespublicas.gob.es'
  ],
  tierA: [
    // Legal, Healthcare, Education, Major Infrastructure
    'abogadoespanol.com', 'legalservicesinspain.com', 'lexidy.com',
    'sspa.juntadeandalucia.es', 'quironsalud.es', 'nhs.uk', 'sanitas.com',
    'uma.es', 'britishcouncil.es', 'ibo.org', 'nabss.org',
    'aena.es', 'renfe.com', 'registradores.org', 'notariado.org',
    'malagasolicitors.es', 'cofaes.es', 'vithas.es', 'hospiten.com'
  ],
  tierB: [
    // Established News & Expat Resources
    'surinenglish.com', 'euroweeklynews.com', 'theolivepress.es',
    'thelocal.es', 'expatica.com', 'internations.org', 'expatarrivals.com',
    'spainexpat.com', 'britoninspain.com', 'eyeonspain.com',
    'essentialmagazine.com', 'thinkspain.com', 'spainenglish.com',
    'inspain.news', 'lachispa.net', 'andaluciatoday.com'
  ],
  tierC: [
    // Tourism, Culture, Museums
    'cuevadenerja.es', 'malaga.com', 'turismo.malaga.eu', 'turismo.benalmadena.es',
    'turismo.estepona.es', 'turismo.fuengirola.es', 'blog.visitcostadelsol.com',
    'malagaturismo.com', 'festivaldemalaga.com', 'museosdemalaga.com',
    'guidetomalaga.com', 'worldtravelguide.net', 'aqualand.es',
    'bioparcfuengirola.es', 'selwomarina.es', 'rmcr.org', 'stupabenalmadena.org',
    'castillomonumentocolomares.com', 'mariposariodebenalmadena.com'
  ],
  tierD: [
    // Nature, Outdoor, Climate
    'caminodelrey.info', 'transandalus.com', 'outdooractive.com',
    'weatherspark.com', 'aemet.es', 'wmo.int', 'weather-and-climate.com',
    'climasyviajes.com', 'climatestotravel.com', 'wikipedia.org',
    'senderismomalaga.com', 'cyclespain.net', 'malagacyclingclub.com',
    'coastalpath.net', 'bicicletasdelsol.com', 'actividadesmalaga.com',
    'diverland.es', 'telefericobenalmadena.com', 'duomoturismo.com'
  ],
  tierE: [
    // Sports, Gastronomy, Local Services
    'padelfederacion.es', 'worldpadeltour.com', 'marbellaguide.com',
    'michelin.com', 'tasteatlas.com', 'gastronomiamalaga.com',
    'tastingspain.es', 'rutasdelvino.es', 'sherry.wine', 'vinomalaga.com',
    'alorenademalaga.com', 'atarazanasmarket.es', 'slowfoodmalaga.com',
    'vivagym.es', 'clubelcandado.com', 'puenteromano.com',
    'reservadelhigueronresort.com', 'yogamarbella.com'
  ],
  tierF: [
    // Local Government, Shopping, Telecom, Sustainability
    'marbella.es', 'fuengirola.es', 'benalmadena.es', 'estepona.es',
    'mijas.es', 'torremolinos.es', 'manilva.es', 'casares.es',
    'elcorteingles.es', 'miramarcc.com', 'movistar.es', 'vodafone.es',
    'agenciaandaluzadelaenergia.es', 'wwf.es', 'renewableenergyworld.com',
    'malaga.eu', 'educasol.org', 'energy.ec.europa.eu'
  ]
};

/**
 * Search a specific batch of domains with Perplexity
 */
async function searchBatch(
  batchDomains: string[],
  articleTopic: string,
  articleContent: string,
  articleLanguage: string,
  perplexityApiKey: string,
  batchName: string
): Promise<BetterCitation[]> {
  
  const languageInstructions = articleLanguage === 'es'
    ? 'Proporciona descripciones en español.'
    : 'Provide descriptions in English.';

  const prompt = `CRITICAL RESTRICTION: You MUST ONLY cite sources from these EXACT domains. DO NOT use any other websites.

APPROVED DOMAINS FOR THIS SEARCH:
${batchDomains.map(d => `- ${d}`).join('\n')}

TASK: Find 5-8 authoritative sources about "${articleTopic}"

${languageInstructions}

Article Context: ${articleContent.substring(0, 500)}

STRICT REQUIREMENTS:
1. ⚠️ ONLY USE THE DOMAINS LISTED ABOVE - NO EXCEPTIONS
2. Each URL must be from one of the approved domains
3. Find recent, high-quality articles
4. Prioritize government, educational, and official sources
5. Return ONLY a valid JSON array

RESPONSE FORMAT (JSON array only, no other text):
[
  {
    "url": "full URL from approved domain",
    "source": "exact domain name from list",
    "description": "what this source covers",
    "relevance": "why relevant to topic",
    "language": "${articleLanguage}"
  }
]

REMINDER: The domains listed above are the ONLY acceptable sources. Any URL from another domain will be rejected.`;

  console.log(`🔍 Searching ${batchName} (${batchDomains.length} domains)...`);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a citation research assistant. You must ONLY cite from the approved domain list provided. Return ONLY valid JSON arrays with no additional text.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${batchName} failed: ${response.status}`);
      console.error(`   Error response:`, errorText);
      console.error(`   Attempted domains:`, batchDomains.slice(0, 5).join(', '), `... (${batchDomains.length} total)`);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`⚠️ ${batchName}: No valid JSON found`);
      return [];
    }

    const citations = JSON.parse(jsonMatch[0]) as BetterCitation[];
    
    // Helper function to extract domain from URL
    const extractDomain = (url: string): string => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        return '';
      }
    };

    // Normalize batch domains for comparison
    const normalizedBatchDomains = batchDomains.map(d => d.toLowerCase().replace(/^www\./, ''));
    
    // Import full approved domain list for additional safety check
    const allApprovedDomains = getAllApprovedDomains();
    
    // Filter: competitors, invalid URLs, and URLs NOT from approved batch domains
    const validCitations = citations
      .filter(c => {
        if (!c.url) {
          console.log(`   ⚠️ Rejected: Missing URL`);
          return false;
        }
        
        if (isCompetitor(c.url)) {
          console.log(`   ⚠️ Rejected: Competitor - ${c.url}`);
          return false;
        }
        
        const citationDomain = extractDomain(c.url);
        if (!citationDomain) {
          console.log(`   ⚠️ Rejected: Invalid URL - ${c.url}`);
          return false;
        }
        
        // Check if domain is in the approved batch
        const isInBatch = normalizedBatchDomains.some(approvedDomain => 
          citationDomain === approvedDomain || citationDomain.endsWith(`.${approvedDomain}`)
        );
        
        // Also check against full approved domain list as safety net
        const isInFullList = allApprovedDomains.some(approvedDomain => {
          const normalizedApproved = approvedDomain.toLowerCase().replace(/^www\./, '');
          return citationDomain === normalizedApproved || citationDomain.endsWith(`.${normalizedApproved}`);
        });
        
        if (!isInBatch && !isInFullList) {
          console.log(`   ⚠️ Rejected: Not from approved domains - ${c.url} (domain: ${citationDomain})`);
          return false;
        }
        
        return true;
      })
      .map(c => {
        const scores = calculateAuthorityScore({
          url: c.url,
          sourceName: c.source || '',
          description: c.description || '',
          isAccessible: true
        });
        return {
          ...c,
          authorityScore: scores.totalScore,
          batchTier: batchName
        };
      });

    console.log(`   ✅ ${batchName}: Found ${validCitations.length} valid citations (from ${citations.length} total)`);
    return validCitations;

  } catch (error) {
    console.error(`❌ ${batchName} error:`, error);
    return [];
  }
}

/**
 * Find citations using cascading batch strategy
 * Searches high-authority batches first, stops when target is reached
 */
export async function findCitationsWithCascade(
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  targetCount: number,
  perplexityApiKey: string,
  focusArea?: string
): Promise<BetterCitation[]> {
  
  console.log(`\n🎯 Finding ${targetCount} citations for: "${articleTopic}" (${articleLanguage})`);
  if (focusArea) {
    console.log(`   Focus: ${focusArea}`);
  }

  const batches = [
    { name: 'Tier S (Gov/Official)', domains: DOMAIN_BATCHES.tierS },
    { name: 'Tier A (Professional)', domains: DOMAIN_BATCHES.tierA },
    { name: 'Tier B (News/Expat)', domains: DOMAIN_BATCHES.tierB },
    { name: 'Tier C (Tourism)', domains: DOMAIN_BATCHES.tierC },
    { name: 'Tier D (Nature/Climate)', domains: DOMAIN_BATCHES.tierD },
    { name: 'Tier E (Sports/Food)', domains: DOMAIN_BATCHES.tierE },
    { name: 'Tier F (Local Services)', domains: DOMAIN_BATCHES.tierF }
  ];

  let allCitations: BetterCitation[] = [];

  for (const batch of batches) {
    if (allCitations.length >= targetCount) {
      console.log(`✅ Target reached! Stopping at ${allCitations.length} citations`);
      break;
    }

    const batchResults = await searchBatch(
      batch.domains,
      focusArea || articleTopic,
      articleContent,
      articleLanguage,
      perplexityApiKey,
      batch.name
    );

    allCitations.push(...batchResults);
    console.log(`   📊 Total: ${allCitations.length}/${targetCount}`);

    // Small delay between batches
    if (allCitations.length < targetCount && batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Sort by authority score and return top results
  const sortedCitations = allCitations
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, targetCount);

  console.log(`\n✨ Final: ${sortedCitations.length} citations selected`);
  console.log(`   Tier breakdown:`, 
    sortedCitations.reduce((acc, c) => {
      acc[c.batchTier || 'unknown'] = (acc[c.batchTier || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  return sortedCitations;
}

/**
 * Verify citation URLs are accessible
 */
export async function verifyCitations(citations: BetterCitation[]): Promise<BetterCitation[]> {
  console.log(`\n🔍 Verifying ${citations.length} URLs...`);
  
  const verificationPromises = citations.map(async (citation) => {
    try {
      const response = await fetch(citation.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      return {
        ...citation,
        verified: response.ok,
        statusCode: response.status
      };
    } catch {
      return {
        ...citation,
        verified: false
      };
    }
  });

  const verifiedCitations = await Promise.all(verificationPromises);
  const verifiedCount = verifiedCitations.filter(c => c.verified).length;
  
  console.log(`   ✅ ${verifiedCount}/${citations.length} URLs verified`);
  
  return verifiedCitations.sort((a, b) => {
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return b.authorityScore - a.authorityScore;
  });
}
