import { BlogArticle } from "@/types/blog";

export interface LinkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  internalLinksCount: number;
  externalCitationsCount: number;
  languageMismatches: number;
  missingInternalLinks: boolean;
  missingExternalCitations: boolean;
  hasGovernmentSource: boolean;
}

const MIN_INTERNAL_LINKS = 3;
const MIN_EXTERNAL_CITATIONS = 2; // Relaxed from 3 due to SSL verification issues with government sites

export function validateArticleLinks(
  article: Partial<BlogArticle>,
  allArticles: Partial<BlogArticle>[]
): LinkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let languageMismatches = 0;

  const internalLinks = article.internal_links || [];
  const externalCitations = article.external_citations || [];
  
  const internalLinksCount = internalLinks.length;
  const externalCitationsCount = externalCitations.length;

  // Check minimum internal links
  const missingInternalLinks = internalLinksCount < MIN_INTERNAL_LINKS;
  if (missingInternalLinks) {
    errors.push(`Only ${internalLinksCount} internal link${internalLinksCount !== 1 ? 's' : ''} (minimum ${MIN_INTERNAL_LINKS} required)`);
  }

  // Check minimum external citations
  const missingExternalCitations = externalCitationsCount < MIN_EXTERNAL_CITATIONS;
  if (missingExternalCitations) {
    errors.push(`Only ${externalCitationsCount} external citation${externalCitationsCount !== 1 ? 's' : ''} (minimum ${MIN_EXTERNAL_CITATIONS} required)`);
  }

  // Validate internal links language matching
  internalLinks.forEach((link: any, index: number) => {
    // Extract article ID from URL (format: /blog/slug)
    const slug = link.url?.replace('/blog/', '');
    const targetArticle = allArticles.find(a => a.slug === slug);
    
    if (targetArticle && targetArticle.language !== article.language) {
      languageMismatches++;
      errors.push(`Internal link ${index + 1} ("${link.text}") points to ${targetArticle.language?.toUpperCase()} article (expected ${article.language?.toUpperCase()})`);
    }

    // Check for empty URLs
    if (!link.url || link.url.trim() === '') {
      errors.push(`Internal link ${index + 1} has empty URL`);
    }

    // Check for empty anchor text
    if (!link.text || link.text.trim() === '') {
      warnings.push(`Internal link ${index + 1} has empty anchor text`);
    }
  });

  // Validate external citations
  const govPatterns = ['.gov', '.gob.', '.edu', '.ac.', 'europa.eu', '.overheid.'];
  const hasGovernmentSource = externalCitations.some((citation: any) => {
    const url = citation.url?.toLowerCase() || '';
    return govPatterns.some(pattern => url.includes(pattern));
  });

  if (!hasGovernmentSource && externalCitationsCount > 0) {
    warnings.push('No government or educational source found (recommended for E-E-A-T)');
  }

  externalCitations.forEach((citation: any, index: number) => {
    // Check for empty URLs
    if (!citation.url || citation.url.trim() === '') {
      errors.push(`External citation ${index + 1} has empty URL`);
    }

    // Check for HTTP (should be HTTPS)
    if (citation.url?.startsWith('http://')) {
      warnings.push(`Citation ${index + 1} uses HTTP instead of HTTPS`);
    }

    // Check for empty source
    if (!citation.source || citation.source.trim() === '') {
      warnings.push(`Citation ${index + 1} has empty source name`);
    }
  });

  // Check for duplicate URLs in internal links
  const internalUrls = internalLinks.map((link: any) => link.url);
  const duplicateInternalUrls = internalUrls.filter((url, index) => internalUrls.indexOf(url) !== index);
  if (duplicateInternalUrls.length > 0) {
    warnings.push(`${duplicateInternalUrls.length} duplicate internal link${duplicateInternalUrls.length !== 1 ? 's' : ''} found`);
  }

  // Check for duplicate URLs in external citations
  const externalUrls = externalCitations.map((citation: any) => citation.url);
  const duplicateExternalUrls = externalUrls.filter((url, index) => externalUrls.indexOf(url) !== index);
  if (duplicateExternalUrls.length > 0) {
    warnings.push(`${duplicateExternalUrls.length} duplicate external citation${duplicateExternalUrls.length !== 1 ? 's' : ''} found`);
  }

  const isValid = errors.length === 0 && !missingInternalLinks && !missingExternalCitations;

  return {
    isValid,
    errors,
    warnings,
    internalLinksCount,
    externalCitationsCount,
    languageMismatches,
    missingInternalLinks,
    missingExternalCitations,
    hasGovernmentSource,
  };
}

export function validateAllArticles(
  articles: Partial<BlogArticle>[]
): Map<string, LinkValidationResult> {
  const validationResults = new Map<string, LinkValidationResult>();

  articles.forEach((article) => {
    if (article.slug) {
      const result = validateArticleLinks(article, articles);
      validationResults.set(article.slug, result);
    }
  });

  return validationResults;
}

export function getClusterValidationSummary(
  validationResults: Map<string, LinkValidationResult>
): {
  totalArticles: number;
  validArticles: number;
  invalidArticles: number;
  totalErrors: number;
  totalWarnings: number;
  articlesWithMissingLinks: number;
  articlesWithMissingCitations: number;
  isClusterValid: boolean;
} {
  const results = Array.from(validationResults.values());

  return {
    totalArticles: results.length,
    validArticles: results.filter(r => r.isValid).length,
    invalidArticles: results.filter(r => !r.isValid).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    articlesWithMissingLinks: results.filter(r => r.missingInternalLinks).length,
    articlesWithMissingCitations: results.filter(r => r.missingExternalCitations).length,
    isClusterValid: results.every(r => r.isValid),
  };
}
