// Link Pattern Validator - Ensure Articles Follow Required Linking Patterns

import { BlogArticle } from "@/types/blog";

export interface LinkPattern {
  hasParentCategoryLink: boolean;
  hasRelatedArticleLink: boolean;
  hasServiceLink: boolean;
  parentCategoryUrl: string | null;
  relatedArticleUrls: string[];
  serviceUrl: string | null;
}

export interface LinkPatternValidation extends LinkPattern {
  missingPatterns: string[];
  complianceScore: number; // 0-100
  recommendations: string[];
}

const SERVICE_PAGES = ['/about', '/faq', '/qa', '/case-studies'];

/**
 * Validate link patterns for a single article
 */
export function validateLinkPatterns(
  article: Partial<BlogArticle>,
  allArticles: Partial<BlogArticle>[]
): LinkPatternValidation {
  
  const pattern = extractLinkPattern(article);
  const missingPatterns: string[] = [];
  const recommendations: string[] = [];

  // Check parent category link
  if (!pattern.hasParentCategoryLink) {
    missingPatterns.push('parent_category');
    recommendations.push(
      `Add a link to /blog/category/${article.category} to help users discover related content`
    );
  }

  // Check related article link
  if (!pattern.hasRelatedArticleLink) {
    missingPatterns.push('related_article');
    recommendations.push(
      'Add at least one link to a related article in the same category or funnel stage'
    );
  }

  // Check service/conversion link
  if (!pattern.hasServiceLink) {
    missingPatterns.push('service_link');
    
    const suggestedService = getSuggestedServicePage(article.funnel_stage);
    recommendations.push(
      `Add a link to ${suggestedService} to guide users toward conversion`
    );
  }

  // Calculate compliance score
  const totalPatterns = 3;
  const completedPatterns = totalPatterns - missingPatterns.length;
  const complianceScore = Math.round((completedPatterns / totalPatterns) * 100);

  return {
    ...pattern,
    missingPatterns,
    complianceScore,
    recommendations,
  };
}

/**
 * Extract link pattern from article content and internal_links field
 */
function extractLinkPattern(article: Partial<BlogArticle>): LinkPattern {
  const pattern: LinkPattern = {
    hasParentCategoryLink: false,
    hasRelatedArticleLink: false,
    hasServiceLink: false,
    parentCategoryUrl: null,
    relatedArticleUrls: [],
    serviceUrl: null,
  };

  // Check internal_links field
  if (article.internal_links && Array.isArray(article.internal_links)) {
    for (const link of article.internal_links) {
      const url = link.url || '';

      // Check for category link
      if (url.includes('/blog/category/') && url.includes(article.category || '')) {
        pattern.hasParentCategoryLink = true;
        pattern.parentCategoryUrl = url;
      }

      // Check for related article link
      if (url.startsWith('/blog/') && !url.includes('/category/')) {
        pattern.hasRelatedArticleLink = true;
        pattern.relatedArticleUrls.push(url);
      }

      // Check for service link
      if (SERVICE_PAGES.some(page => url === page || url.startsWith(page))) {
        pattern.hasServiceLink = true;
        pattern.serviceUrl = url;
      }
    }
  }

  // Also check detailed_content for inline links
  if (article.detailed_content) {
    const categoryUrl = `/blog/category/${article.category}`;
    if (article.detailed_content.includes(categoryUrl)) {
      pattern.hasParentCategoryLink = true;
      pattern.parentCategoryUrl = categoryUrl;
    }

    // Check for service page links in content
    for (const servicePage of SERVICE_PAGES) {
      if (article.detailed_content.includes(`href="${servicePage}"`)) {
        pattern.hasServiceLink = true;
        pattern.serviceUrl = servicePage;
        break;
      }
    }
  }

  return pattern;
}

/**
 * Get suggested service page based on funnel stage
 */
function getSuggestedServicePage(funnelStage?: string): string {
  switch (funnelStage) {
    case 'TOFU':
      return '/faq'; // Awareness stage → FAQ
    case 'MOFU':
      return '/case-studies'; // Consideration → Case Studies
    case 'BOFU':
      return '/about'; // Decision → About (contact)
    default:
      return '/about';
  }
}

/**
 * Validate link patterns for multiple articles
 */
export function validateAllLinkPatterns(
  articles: Partial<BlogArticle>[]
): Map<string, LinkPatternValidation> {
  
  const validations = new Map<string, LinkPatternValidation>();

  for (const article of articles) {
    if (article.id) {
      const validation = validateLinkPatterns(article, articles);
      validations.set(article.id, validation);
    }
  }

  return validations;
}

/**
 * Generate summary report for pattern compliance
 */
export function generatePatternComplianceReport(
  validations: Map<string, LinkPatternValidation>
): {
  totalArticles: number;
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  averageComplianceScore: number;
  missingPatternCounts: Record<string, number>;
} {
  
  let fullyCompliant = 0;
  let partiallyCompliant = 0;
  let nonCompliant = 0;
  let totalScore = 0;
  const missingPatternCounts: Record<string, number> = {
    parent_category: 0,
    related_article: 0,
    service_link: 0,
  };

  for (const validation of validations.values()) {
    totalScore += validation.complianceScore;

    if (validation.complianceScore === 100) {
      fullyCompliant++;
    } else if (validation.complianceScore >= 50) {
      partiallyCompliant++;
    } else {
      nonCompliant++;
    }

    for (const pattern of validation.missingPatterns) {
      missingPatternCounts[pattern]++;
    }
  }

  const averageComplianceScore = validations.size > 0 
    ? Math.round(totalScore / validations.size)
    : 0;

  return {
    totalArticles: validations.size,
    fullyCompliant,
    partiallyCompliant,
    nonCompliant,
    averageComplianceScore,
    missingPatternCounts,
  };
}

/**
 * Get articles that need pattern improvements
 */
export function getArticlesNeedingPatternFixes(
  validations: Map<string, LinkPatternValidation>,
  scoreThreshold: number = 100
): Array<{ articleId: string; validation: LinkPatternValidation }> {
  
  const needsFixes: Array<{ articleId: string; validation: LinkPatternValidation }> = [];

  for (const [articleId, validation] of validations.entries()) {
    if (validation.complianceScore < scoreThreshold) {
      needsFixes.push({ articleId, validation });
    }
  }

  return needsFixes.sort((a, b) => a.validation.complianceScore - b.validation.complianceScore);
}
