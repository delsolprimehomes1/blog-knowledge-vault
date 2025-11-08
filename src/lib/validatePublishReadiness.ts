/**
 * Comprehensive Article Publish Readiness Validator
 * Validates all requirements before bulk publishing articles
 */

import type { BlogArticle, Author, ExternalCitation } from "@/types/blog";
import { validateSchemaRequirements } from "./schemaGenerator";
import { validateHTMLHeadingHierarchy } from "./htmlHeadingValidator";
import { isApprovedDomain } from "./citationApprovalChecker";
import { validateCitationQuality } from "./citationQualityValidator";
import { validateArticleLinks } from "./linkValidation";

export interface PublishValidationReport {
  isReady: boolean;
  canPublishWithWarnings: boolean;
  errors: string[];
  warnings: string[];
  blockers: string[]; // Critical issues that prevent publishing
  sections: {
    schema: { passed: boolean; issues: string[] };
    headings: { passed: boolean; issues: string[] };
    eeat: { passed: boolean; issues: string[] };
    speakable: { passed: boolean; issues: string[] };
    citations: { passed: boolean; issues: string[] };
    links: { passed: boolean; issues: string[] };
  };
}

// Competitor domains that must not be cited
const BANNED_DOMAINS = [
  'kyero.com', 'idealista.com', 'fotocasa.es', 'pisos.com',
  'spainhouses.net', 'propertyportal.com', 'rightmove.co.uk',
  'zoopla.co.uk', 'myhome.ie', 'daft.ie'
];

function isBannedDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return BANNED_DOMAINS.some(banned => 
      domain === banned || domain.endsWith(`.${banned}`)
    );
  } catch {
    return false;
  }
}

/**
 * Validate single article for publish readiness
 */
export function validateArticlePublishReadiness(
  article: Partial<BlogArticle>,
  author: Author | null,
  reviewer: Author | null,
  allArticles: Partial<BlogArticle>[] = []
): PublishValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  
  const sections = {
    schema: { passed: true, issues: [] as string[] },
    headings: { passed: true, issues: [] as string[] },
    eeat: { passed: true, issues: [] as string[] },
    speakable: { passed: true, issues: [] as string[] },
    citations: { passed: true, issues: [] as string[] },
    links: { passed: true, issues: [] as string[] },
  };

  // ============= SCHEMA VALIDATION =============
  const schemaErrors = validateSchemaRequirements(article as BlogArticle);
  schemaErrors.forEach(error => {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('headline') || errorMsg.includes('meta_description') || 
        errorMsg.includes('featured_image')) {
      blockers.push(errorMsg);
      sections.schema.passed = false;
      sections.schema.issues.push(errorMsg);
    } else {
      warnings.push(errorMsg);
      sections.schema.issues.push(errorMsg);
    }
  });

  // Check required fields
  if (!article.headline) {
    blockers.push('Missing headline');
    sections.schema.passed = false;
    sections.schema.issues.push('Missing headline');
  }
  if (!article.meta_description) {
    blockers.push('Missing meta description');
    sections.schema.passed = false;
    sections.schema.issues.push('Missing meta description');
  }
  if (!article.featured_image_url) {
    blockers.push('Missing featured image');
    sections.schema.passed = false;
    sections.schema.issues.push('Missing featured image');
  }
  if (!article.featured_image_alt) {
    warnings.push('Missing featured image alt text');
    sections.schema.issues.push('Missing featured image alt text');
  }

  // ============= HEADING VALIDATION =============
  if (article.detailed_content) {
    const headingResult = validateHTMLHeadingHierarchy(
      article.detailed_content,
      article.headline
    );
    
    if (!headingResult.isValid) {
      headingResult.errors.forEach(error => {
        blockers.push(`Heading: ${error}`);
        sections.headings.passed = false;
        sections.headings.issues.push(error);
      });
    }
    
    headingResult.warnings.forEach(warning => {
      warnings.push(`Heading: ${warning}`);
      sections.headings.issues.push(warning);
    });
  } else {
    blockers.push('Missing detailed content');
    sections.headings.passed = false;
    sections.headings.issues.push('Missing detailed content');
  }

  // ============= E-E-A-T VALIDATION =============
  if (!article.author_id) {
    blockers.push('Missing author assignment');
    sections.eeat.passed = false;
    sections.eeat.issues.push('Missing author assignment');
  } else if (author) {
    if (!author.credentials || author.credentials.length === 0) {
      warnings.push('Author missing credentials');
      sections.eeat.issues.push('Author missing credentials');
    }
    if (!author.years_experience || author.years_experience === 0) {
      warnings.push('Author missing experience years');
      sections.eeat.issues.push('Author missing experience years');
    }
  }

  if (!article.reviewer_id) {
    blockers.push('Missing reviewer (required for Medical Review badge)');
    sections.eeat.passed = false;
    sections.eeat.issues.push('Missing reviewer assignment');
  } else if (reviewer) {
    if (!reviewer.credentials || reviewer.credentials.length === 0) {
      warnings.push('Reviewer missing credentials');
      sections.eeat.issues.push('Reviewer missing credentials');
    }
  }

  if (!article.date_modified) {
    warnings.push('Missing last modified date');
    sections.eeat.issues.push('Missing last modified date');
  }

  // ============= SPEAKABLE VALIDATION =============
  if (!article.speakable_answer) {
    blockers.push('Missing speakable answer');
    sections.speakable.passed = false;
    sections.speakable.issues.push('Missing speakable answer');
  } else {
    const length = article.speakable_answer.length;
    if (length < 150) {
      warnings.push(`Speakable answer too short (${length} chars, min 150)`);
      sections.speakable.issues.push(`Too short: ${length} chars`);
    } else if (length > 300) {
      warnings.push(`Speakable answer too long (${length} chars, max 300)`);
      sections.speakable.issues.push(`Too long: ${length} chars`);
    }
  }

  // ============= CITATION VALIDATION =============
  const citations = article.external_citations as ExternalCitation[] || [];
  
  if (citations.length === 0) {
    blockers.push('No external citations');
    sections.citations.passed = false;
    sections.citations.issues.push('No external citations');
  } else {
    // Check for banned competitor domains
    const bannedCites = citations.filter(c => isBannedDomain(c.url));
    if (bannedCites.length > 0) {
      blockers.push(`${bannedCites.length} competitor domain(s) found`);
      sections.citations.passed = false;
      sections.citations.issues.push(`${bannedCites.length} competitor citations`);
    }

    // Check all citations are from approved domains
    const unapprovedCites = citations.filter(c => !isApprovedDomain(c.url));
    if (unapprovedCites.length > 0) {
      blockers.push(`${unapprovedCites.length} non-approved citation(s)`);
      sections.citations.passed = false;
      sections.citations.issues.push(`${unapprovedCites.length} non-approved domains`);
    }

    // Check authority scores
    const lowAuthority = citations.filter(c => (c.authorityScore || 0) < 70);
    if (lowAuthority.length > citations.length / 2) {
      warnings.push('More than 50% citations have low authority (<70)');
      sections.citations.issues.push(`${lowAuthority.length} low authority citations`);
    }

    // Check for government/official sources
    const govSources = citations.filter(c => 
      c.sourceType === 'government' || 
      c.url.includes('.gov') || 
      c.url.includes('.gob.es') ||
      c.url.includes('.edu')
    );
    if (govSources.length === 0 && article.funnel_stage === 'BOFU') {
      warnings.push('No government/official sources (recommended for BOFU)');
      sections.citations.issues.push('No government/official sources');
    }

    // Citation quality check
    if (article.funnel_stage) {
      const qualityReport = validateCitationQuality(citations, article.funnel_stage);
      if (!qualityReport.isValid) {
        qualityReport.errors.forEach(error => {
          blockers.push(`Citation: ${error}`);
          sections.citations.passed = false;
          sections.citations.issues.push(error);
        });
      }
    }
  }

  // ============= LINK VALIDATION =============
  const linkResult = validateArticleLinks(article, allArticles);
  if (!linkResult.isValid) {
    linkResult.errors.forEach(error => {
      blockers.push(`Links: ${error}`);
      sections.links.passed = false;
      sections.links.issues.push(error);
    });
  }
  linkResult.warnings.forEach(warning => {
    warnings.push(`Links: ${warning}`);
    sections.links.issues.push(warning);
  });

  // ============= FAQ VALIDATION =============
  const faqCount = article.faq_entities?.length || 0;
  if (faqCount === 0) {
    warnings.push('No FAQ entities (recommended for AEO)');
    sections.schema.issues.push('No FAQ entities');
  } else if (faqCount < 3) {
    warnings.push(`Only ${faqCount} FAQ entities (recommended: 3+)`);
    sections.schema.issues.push(`Only ${faqCount} FAQs`);
  }

  // Determine overall status
  const isReady = blockers.length === 0;
  const canPublishWithWarnings = blockers.length === 0 && warnings.length > 0;

  return {
    isReady,
    canPublishWithWarnings,
    errors,
    warnings,
    blockers,
    sections,
  };
}

/**
 * Validate multiple articles for bulk publish
 */
export function validateBulkPublish(
  articles: Partial<BlogArticle>[],
  authorsMap: Map<string, Author>,
  reviewersMap: Map<string, Author>
): Map<string, PublishValidationReport> {
  const results = new Map<string, PublishValidationReport>();
  
  articles.forEach(article => {
    const author = article.author_id ? authorsMap.get(article.author_id) || null : null;
    const reviewer = article.reviewer_id ? reviewersMap.get(article.reviewer_id) || null : null;
    
    const report = validateArticlePublishReadiness(article, author, reviewer, articles);
    results.set(article.id!, report);
  });
  
  return results;
}
