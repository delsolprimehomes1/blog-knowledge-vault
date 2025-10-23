// Link Validation Utilities

export interface LinkValidationResult {
  url: string;
  isWorking: boolean;
  statusCode: number | null;
  language: string | null;
  contentSummary: string | null;
  isRelevant: boolean | null;
  relevanceScore: number | null;
  error: string | null;
}

export interface ArticleLinkValidation {
  articleId: string;
  articleSlug: string;
  articleLanguage: string;
  articleTopic: string;
  externalLinks: LinkValidationResult[];
  internalLinks: LinkValidationResult[];
  brokenLinksCount: number;
  languageMismatchCount: number;
  irrelevantLinksCount: number;
  validationDate: string;
}

export interface BetterLinkSuggestion {
  originalUrl: string;
  suggestedUrl: string;
  sourceName: string;
  relevanceScore: number;
  authorityScore: number;
  reason: string;
}

/**
 * Extract all external links from article content
 */
export function extractExternalLinks(content: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1];
    // Only external links (not starting with /)
    if (!url.startsWith('/') && !url.startsWith('#')) {
      links.push(url);
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Extract all internal links from article content
 */
export function extractInternalLinks(content: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1];
    // Only internal links (starting with /)
    if (url.startsWith('/') && !url.startsWith('//')) {
      links.push(url);
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Detect language from URL patterns
 */
export function detectLanguageFromUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  
  // Spanish domains
  if (lowerUrl.includes('.es') || lowerUrl.includes('.gob.es')) {
    return 'es';
  }
  
  // English domains
  if (lowerUrl.includes('.gov') || lowerUrl.includes('.gov.uk') || 
      lowerUrl.includes('.edu') || lowerUrl.includes('.ac.uk')) {
    return 'en';
  }
  
  // German domains
  if (lowerUrl.includes('.de')) {
    return 'de';
  }
  
  // Dutch domains
  if (lowerUrl.includes('.nl')) {
    return 'nl';
  }
  
  return null;
}

/**
 * Calculate link health score (0-100)
 */
export function calculateLinkHealthScore(
  validation: ArticleLinkValidation
): number {
  const totalLinks = validation.externalLinks.length + validation.internalLinks.length;
  if (totalLinks === 0) return 0;

  const workingLinks = [
    ...validation.externalLinks,
    ...validation.internalLinks
  ].filter(link => link.isWorking).length;

  const relevantLinks = [
    ...validation.externalLinks,
    ...validation.internalLinks
  ].filter(link => link.isRelevant !== false).length;

  const languageMatchedLinks = [
    ...validation.externalLinks,
    ...validation.internalLinks
  ].filter(link => 
    !link.language || link.language === validation.articleLanguage
  ).length;

  // Weighted scoring
  const workingScore = (workingLinks / totalLinks) * 40;
  const relevanceScore = (relevantLinks / totalLinks) * 40;
  const languageScore = (languageMatchedLinks / totalLinks) * 20;

  return Math.round(workingScore + relevanceScore + languageScore);
}
