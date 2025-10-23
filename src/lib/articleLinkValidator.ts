// Complete Article Link Validation Workflow
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type { ArticleLinkValidation } from "./linkValidator";

// Input validation schemas
const articleIdSchema = z.string().uuid({ message: "Invalid article ID format" });

const validationOptionsSchema = z.object({
  articleId: z.string().uuid(),
  skipPerplexity: z.boolean().optional().default(false),
  verifyUrls: z.boolean().optional().default(true),
}).strict();

export type ValidationOptions = z.infer<typeof validationOptionsSchema>;

/**
 * Complete article link validation workflow
 * 
 * Process:
 * 1. Validates input parameters
 * 2. Fetches article from database
 * 3. Extracts all external and internal links
 * 4. Validates link accessibility
 * 5. Analyzes relevance with Perplexity AI
 * 6. Calculates quality metrics
 * 7. Stores results in database
 * 8. Returns comprehensive validation report
 */
export async function validateArticleLinks(
  articleId: string,
  options: Partial<ValidationOptions> = {}
): Promise<ArticleLinkValidation> {
  
  // SECURITY: Validate input parameters
  try {
    articleIdSchema.parse(articleId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid article ID: ${error.errors[0].message}`);
    }
    throw error;
  }

  const validatedOptions = validationOptionsSchema.parse({
    articleId,
    ...options,
  });

  console.log(`Starting link validation for article: ${articleId}`);

  try {
    // Call the edge function with validated inputs
    const { data, error } = await supabase.functions.invoke('validate-article-links', {
      body: {
        articleId: validatedOptions.articleId,
        skipPerplexity: validatedOptions.skipPerplexity,
        verifyUrls: validatedOptions.verifyUrls,
      }
    });

    if (error) {
      console.error('Validation error:', error);
      throw new Error(`Link validation failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No validation data returned');
    }

    console.log(`Validation complete: ${data.brokenLinksCount} broken, ${data.languageMismatchCount} mismatched, ${data.irrelevantLinksCount} irrelevant`);

    return data as ArticleLinkValidation;
  } catch (error) {
    console.error('Article link validation error:', error);
    throw error;
  }
}

/**
 * Batch validate multiple articles
 * Useful for content audits or automated monitoring
 */
export async function validateMultipleArticles(
  articleIds: string[],
  options: Partial<ValidationOptions> = {}
): Promise<Map<string, ArticleLinkValidation | Error>> {
  
  // SECURITY: Validate all article IDs
  const validationResults = new Map<string, ArticleLinkValidation | Error>();
  
  for (const articleId of articleIds) {
    try {
      articleIdSchema.parse(articleId);
    } catch (error) {
      validationResults.set(articleId, new Error('Invalid article ID format'));
      continue;
    }
  }

  console.log(`Batch validating ${articleIds.length} articles`);

  // Process articles sequentially to avoid overwhelming Perplexity API
  for (const articleId of articleIds) {
    if (validationResults.has(articleId)) continue; // Skip invalid IDs

    try {
      const result = await validateArticleLinks(articleId, options);
      validationResults.set(articleId, result);
      
      // Rate limiting: wait 1 second between articles
      if (articleIds.indexOf(articleId) < articleIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to validate article ${articleId}:`, error);
      validationResults.set(
        articleId, 
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  console.log(`Batch validation complete: ${validationResults.size} articles processed`);

  return validationResults;
}

/**
 * Get validation history for an article
 */
export async function getValidationHistory(
  articleId: string,
  limit: number = 10
): Promise<ArticleLinkValidation[]> {
  
  // SECURITY: Validate inputs
  articleIdSchema.parse(articleId);
  
  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  const { data, error } = await supabase
    .from('link_validations')
    .select('*')
    .eq('article_id', articleId)
    .order('validation_date', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch validation history: ${error.message}`);
  }

  return (data || []).map(row => ({
    articleId: row.article_id,
    articleSlug: row.article_slug,
    articleLanguage: row.article_language,
    articleTopic: row.article_topic,
    externalLinks: row.external_links as any[],
    internalLinks: row.internal_links as any[],
    brokenLinksCount: row.broken_links_count,
    languageMismatchCount: row.language_mismatch_count,
    irrelevantLinksCount: row.irrelevant_links_count,
    validationDate: row.validation_date,
  }));
}

/**
 * Get articles that need validation (haven't been validated recently)
 */
export async function getArticlesNeedingValidation(
  daysThreshold: number = 7
): Promise<string[]> {
  
  if (daysThreshold < 1 || daysThreshold > 365) {
    throw new Error('Days threshold must be between 1 and 365');
  }

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('id, slug')
    .eq('status', 'published');

  if (error) {
    throw new Error(`Failed to fetch articles: ${error.message}`);
  }

  const articleIds = articles?.map(a => a.id) || [];

  // Check which articles don't have recent validations
  const { data: recentValidations, error: validationError } = await supabase
    .from('link_validations')
    .select('article_id')
    .gte('validation_date', thresholdDate.toISOString())
    .in('article_id', articleIds);

  if (validationError) {
    throw new Error(`Failed to fetch validations: ${validationError.message}`);
  }

  const recentlyValidatedIds = new Set(
    recentValidations?.map(v => v.article_id) || []
  );

  const needsValidation = articleIds.filter(id => !recentlyValidatedIds.has(id));

  console.log(`Found ${needsValidation.length} articles needing validation (threshold: ${daysThreshold} days)`);

  return needsValidation;
}

/**
 * Calculate overall link health score for an article
 */
export function calculateArticleLinkHealth(
  validation: ArticleLinkValidation
): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  strengths: string[];
} {
  const totalLinks = validation.externalLinks.length + validation.internalLinks.length;
  
  if (totalLinks === 0) {
    return {
      score: 0,
      grade: 'F',
      issues: ['No links found in article'],
      strengths: [],
    };
  }

  let score = 100;
  const issues: string[] = [];
  const strengths: string[] = [];

  // Broken links penalty (critical)
  const brokenPenalty = (validation.brokenLinksCount / totalLinks) * 40;
  score -= brokenPenalty;
  if (validation.brokenLinksCount > 0) {
    issues.push(`${validation.brokenLinksCount} broken link(s)`);
  } else {
    strengths.push('All links are working');
  }

  // Language mismatch penalty (moderate)
  const languagePenalty = (validation.languageMismatchCount / totalLinks) * 20;
  score -= languagePenalty;
  if (validation.languageMismatchCount > 0) {
    issues.push(`${validation.languageMismatchCount} language mismatch(es)`);
  } else {
    strengths.push('All links match article language');
  }

  // Irrelevant links penalty (moderate)
  const irrelevantPenalty = (validation.irrelevantLinksCount / totalLinks) * 20;
  score -= irrelevantPenalty;
  if (validation.irrelevantLinksCount > 0) {
    issues.push(`${validation.irrelevantLinksCount} irrelevant link(s)`);
  } else {
    strengths.push('All links are contextually relevant');
  }

  // Authority scoring bonus (check for government sources)
  const govLinks = validation.externalLinks.filter(link => 
    link.url.includes('.gov') || 
    link.url.includes('.gob.es') || 
    link.url.includes('.edu') ||
    link.authorityLevel === 'high'
  ).length;

  if (govLinks > 0) {
    strengths.push(`${govLinks} high-authority source(s)`);
  }

  // Determine grade
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score, grade, issues, strengths };
}

/**
 * Generate a validation report for multiple articles
 */
export function generateBatchValidationReport(
  validations: Map<string, ArticleLinkValidation | Error>
): {
  totalArticles: number;
  successfulValidations: number;
  failedValidations: number;
  averageScore: number;
  totalBrokenLinks: number;
  totalLanguageMismatches: number;
  totalIrrelevantLinks: number;
  articlesNeedingAttention: string[];
} {
  let successfulValidations = 0;
  let failedValidations = 0;
  let totalScore = 0;
  let totalBrokenLinks = 0;
  let totalLanguageMismatches = 0;
  let totalIrrelevantLinks = 0;
  const articlesNeedingAttention: string[] = [];

  for (const [articleId, result] of validations) {
    if (result instanceof Error) {
      failedValidations++;
      continue;
    }

    successfulValidations++;
    
    const health = calculateArticleLinkHealth(result);
    totalScore += health.score;
    
    totalBrokenLinks += result.brokenLinksCount;
    totalLanguageMismatches += result.languageMismatchCount;
    totalIrrelevantLinks += result.irrelevantLinksCount;

    if (health.score < 70) {
      articlesNeedingAttention.push(articleId);
    }
  }

  const averageScore = successfulValidations > 0 
    ? Math.round(totalScore / successfulValidations) 
    : 0;

  return {
    totalArticles: validations.size,
    successfulValidations,
    failedValidations,
    averageScore,
    totalBrokenLinks,
    totalLanguageMismatches,
    totalIrrelevantLinks,
    articlesNeedingAttention,
  };
}
