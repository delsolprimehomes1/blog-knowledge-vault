import { BlogArticle, ExternalCitation, FunnelStage } from "@/types/blog";

export interface CitationQualityReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalCitations: number;
    highAuthority: number; // 70+
    approvedDomains: number;
    competitorDomains: number;
    deadLinks: number;
    averageAuthority: number;
  };
}

// Competitor domains that should NEVER be cited
const BANNED_DOMAINS = [
  'idealista.com',
  'fotocasa.es',
  'habitaclia.com',
  'pisos.com',
  'tucasa.com',
  'yaencontre.com',
  'century21',
  'remax',
  'sothebysrealty',
  'engelandvoelkers',
];

// Expected citation counts by funnel stage
const CITATION_TARGETS: Record<FunnelStage, { min: number; recommended: number }> = {
  TOFU: { min: 3, recommended: 5 },
  MOFU: { min: 4, recommended: 5 },
  BOFU: { min: 5, recommended: 6 },
};

/**
 * Validates citation quality for an article before publishing
 * BLOCKS publishing if:
 * - Any citation has authority score < 70
 * - Any banned competitor domain is cited
 * - Citation count is below minimum
 */
export function validateCitationQuality(
  citations: ExternalCitation[],
  funnelStage: FunnelStage
): CitationQualityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    totalCitations: citations.length,
    highAuthority: 0,
    approvedDomains: 0,
    competitorDomains: 0,
    deadLinks: 0,
    averageAuthority: 0,
  };

  // Calculate stats
  citations.forEach((citation) => {
    const authority = citation.authorityScore || 0;
    
    if (authority >= 70) {
      stats.highAuthority++;
    }
    
    // Check for competitor domains (CRITICAL ERROR)
    const domain = extractDomain(citation.url);
    if (BANNED_DOMAINS.some(banned => domain.includes(banned))) {
      stats.competitorDomains++;
      errors.push(
        `BANNED: "${citation.source}" (${domain}) is a competitor domain and cannot be cited`
      );
    }
  });

  // Calculate average authority
  if (citations.length > 0) {
    const totalAuthority = citations.reduce(
      (sum, c) => sum + (c.authorityScore || 0),
      0
    );
    stats.averageAuthority = Math.round(totalAuthority / citations.length);
  }

  // CRITICAL: Block if any citation has authority < 70
  const lowAuthorityCitations = citations.filter(
    (c) => (c.authorityScore || 0) < 70
  );
  if (lowAuthorityCitations.length > 0) {
    errors.push(
      `${lowAuthorityCitations.length} citation${lowAuthorityCitations.length !== 1 ? 's have' : ' has'} authority score below 70. Use "Find Better Sources" to replace them.`
    );
  }

  // CRITICAL: Block if any competitor domains found
  if (stats.competitorDomains > 0) {
    errors.push(
      `Found ${stats.competitorDomains} banned competitor citation${stats.competitorDomains !== 1 ? 's' : ''}. Remove or replace immediately.`
    );
  }

  // Check citation count against targets
  const target = CITATION_TARGETS[funnelStage];
  if (citations.length < target.min) {
    errors.push(
      `${funnelStage} articles need at least ${target.min} citations (found ${citations.length})`
    );
  } else if (citations.length < target.recommended) {
    warnings.push(
      `Consider adding ${target.recommended - citations.length} more citation${target.recommended - citations.length !== 1 ? 's' : ''} for optimal authority (recommended: ${target.recommended})`
    );
  }

  // Check for government sources
  const govSources = citations.filter((c) =>
    /\.(gov|gob\.es|europa\.eu|edu)/.test(c.url)
  );
  if (govSources.length === 0) {
    warnings.push(
      'No government/institutional sources (.gov, .gob.es, .edu) found. These improve E-E-A-T.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Batch validate all articles in a cluster
 */
export function validateClusterCitationQuality(
  articles: Partial<BlogArticle>[]
): Map<string, CitationQualityReport> {
  const results = new Map<string, CitationQualityReport>();

  articles.forEach((article) => {
    if (article.slug && article.external_citations && article.funnel_stage) {
      const report = validateCitationQuality(
        article.external_citations,
        article.funnel_stage
      );
      results.set(article.slug, report);
    }
  });

  return results;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Calculate overall cluster quality score (0-100)
 */
export function calculateClusterQualityScore(
  reports: Map<string, CitationQualityReport>
): number {
  if (reports.size === 0) return 0;

  let totalScore = 0;
  reports.forEach((report) => {
    // Each article scores 0-100 based on:
    // - No errors: +50
    // - High authority %: +30 (scaled by highAuthority/totalCitations)
    // - No warnings: +20
    let articleScore = 0;
    
    if (report.isValid) articleScore += 50;
    
    if (report.stats.totalCitations > 0) {
      const authorityPercent = report.stats.highAuthority / report.stats.totalCitations;
      articleScore += authorityPercent * 30;
    }
    
    if (report.warnings.length === 0) articleScore += 20;
    
    totalScore += articleScore;
  });

  return Math.round(totalScore / reports.size);
}
