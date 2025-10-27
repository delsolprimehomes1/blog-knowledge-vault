/**
 * Authority Scoring System for Citations
 * 
 * Rates citations based on domain authority, content quality, 
 * accessibility, and relevance (0-100 scale)
 */

export interface AuthorityScores {
  domainScore: number;        // 0-40 points
  contentScore: number;       // 0-30 points
  accessibilityScore: number; // 0-20 points
  relevanceScore: number;     // 0-10 points
  totalScore: number;         // 0-100 points
  tier: 'high' | 'medium' | 'low';
}

/**
 * Calculate comprehensive authority score for a citation
 */
export function calculateAuthorityScore(citation: {
  url: string;
  sourceName: string;
  description: string;
  isAccessible: boolean;
}): AuthorityScores {
  
  const domain = extractDomain(citation.url);
  let domainScore = 0;
  let contentScore = 0;
  let accessibilityScore = citation.isAccessible ? 20 : 0;
  let relevanceScore = 5; // Base relevance
  
  // ==== Domain Authority (0-40 points) ==== 
  // INCREASED WEIGHTING FOR GOVERNMENT SOURCES (AI Citation Priority)
  if (domain.match(/\.(gov|gob|edu|ac)\./)) {
    domainScore = 40; // Government/education - highest authority
  } else if (domain.match(/boe\.es|agenciatributaria|registradores\.org|notariado\.org|juntadeandalucia\.es|seg-social\.es|mpr\.gob\.es/)) {
    domainScore = 40; // Spanish government authorities - PRIMARY TIER
  } else if (domain.match(/europa\.eu|oecd\.org|worldbank\.org|imf\.org|un\.org|ecb\.europa\.eu/)) {
    domainScore = 38; // International organizations
  } else if (domain.match(/gov\.uk|irs\.gov|hmrc\.gov\.uk|belastingdienst\.nl/)) {
    domainScore = 37; // Other government tax/legal authorities
  } else if (domain.match(/bbc\.com|reuters|bloomberg|guardian|elpais\.com|elmundo\.es|ft\.com/)) {
    domainScore = 28; // Major news outlets (reduced to prioritize gov sources)
  } else if (domain.match(/notaries|notariado|registradores|lawyer|legal|abogado|solicitor|attorney/)) {
    domainScore = 26; // Legal/professional services (slightly reduced)
  } else if (domain.match(/\.(org)$/) && !domain.match(/\.(com|net)/)) {
    domainScore = 24; // Non-profits, associations (slightly reduced)
  } else if (domain.match(/turismo|tourism|travel|visit/) && domain.match(/\.es$/)) {
    domainScore = 23; // Official Spanish tourism boards
  } else if (domain.match(/\.(net)$/)) {
    domainScore = 20; // .net domains
  } else {
    domainScore = 12; // General websites - REDUCED to penalize commercial sources
  }
  
  // ==== Content Quality (0-30 points) ====
  const sourceNameLower = citation.sourceName.toLowerCase();
  const descriptionLower = citation.description.toLowerCase();
  
  // Official/authoritative language
  if (sourceNameLower.match(/official|ministry|government|department|agency|authority/)) {
    contentScore += 15;
  } else if (sourceNameLower.match(/lawyer|legal|notary|registrar|professional|attorney/)) {
    contentScore += 12;
  } else if (sourceNameLower.match(/association|institute|council|chamber|federation/)) {
    contentScore += 10;
  } else if (sourceNameLower.match(/news|times|post|journal|magazine/)) {
    contentScore += 8;
  }
  
  // Detailed, quality descriptions
  if (citation.description.length > 150) {
    contentScore += 5; // Comprehensive information
  } else if (citation.description.length > 80) {
    contentScore += 3; // Adequate detail
  }
  
  // Specific, actionable content indicators
  if (descriptionLower.match(/guide|step-by-step|how to|requirements|process|official/)) {
    contentScore += 5;
  }
  
  // Avoid marketing/sales language (reduce score)
  if (descriptionLower.match(/buy now|contact us|our services|best deals|exclusive/)) {
    contentScore -= 10;
  }
  
  // ==== Relevance (0-10 points) ====
  if (descriptionLower.match(/costa del sol|málaga|marbella|estepona|mijas|fuengirola|torremolinos/i)) {
    relevanceScore = 10; // Highly relevant to your region
  } else if (descriptionLower.match(/andalusia|andalucía/i)) {
    relevanceScore = 9; // Regional relevance
  } else if (descriptionLower.match(/spain|spanish|españa|español/i)) {
    relevanceScore = 8; // National relevance
  } else if (descriptionLower.match(/europe|european|eu/i)) {
    relevanceScore = 6; // Continental relevance
  }
  
  // Ensure scores don't exceed max
  contentScore = Math.min(30, Math.max(0, contentScore));
  
  const totalScore = Math.min(100, domainScore + contentScore + accessibilityScore + relevanceScore);
  
  // Tier classification
  const tier = totalScore >= 70 ? 'high' : 
               totalScore >= 40 ? 'medium' : 'low';
  
  return {
    domainScore,
    contentScore,
    accessibilityScore,
    relevanceScore,
    totalScore,
    tier
  };
}

/**
 * Extract clean domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
