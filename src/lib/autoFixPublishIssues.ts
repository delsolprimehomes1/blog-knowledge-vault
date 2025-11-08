import { supabase } from "@/integrations/supabase/client";
import { BlogArticle } from "@/types/blog";
import { PublishValidationReport } from "./validatePublishReadiness";

export interface AutoFixReport {
  articleId: string;
  slug: string;
  headline: string;
  fixesApplied: string[];
  fixesFailed: string[];
  stillBlocked: boolean;
  error?: string;
}

export async function autoFixArticleIssues(
  article: BlogArticle,
  validationReport: PublishValidationReport,
  defaultReviewerId: string
): Promise<AutoFixReport> {
  const report: AutoFixReport = {
    articleId: article.id!,
    slug: article.slug,
    headline: article.headline,
    fixesApplied: [],
    fixesFailed: [],
    stillBlocked: false,
  };

  try {
    let updatedContent = article.detailed_content;
    const updates: Partial<BlogArticle> = {};

    // Fix 1: Add missing H1 heading
    const headingIssues = validationReport.sections.headings.issues;
    if (headingIssues.some(issue => issue.includes("Missing H1") || issue.includes("No H1"))) {
      const h1Tag = `<h1>${article.headline}</h1>`;
      if (!updatedContent.includes('<h1>')) {
        updatedContent = h1Tag + '\n' + updatedContent;
        updates.detailed_content = updatedContent;
        report.fixesApplied.push("Added H1 heading");
      }
    }

    // Fix 2: Assign default reviewer
    if (!article.reviewer_id && defaultReviewerId) {
      updates.reviewer_id = defaultReviewerId;
      report.fixesApplied.push("Assigned reviewer");
    }

    // Fix 3: Set date_modified
    if (!article.date_modified) {
      updates.date_modified = new Date().toISOString();
      report.fixesApplied.push("Set modification date");
    }

    // Apply basic fixes first
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('blog_articles')
        .update(updates as any)
        .eq('id', article.id!);

      if (error) {
        report.fixesFailed.push(`Database update failed: ${error.message}`);
      }
    }

    // Fix 4: Replace low-authority citations
    const citationIssues = validationReport.sections.citations.issues;
    const needsBetterCitations = citationIssues.some(
      issue => issue.includes("authority") || issue.includes("government") || issue.includes("approved")
    );

    if (needsBetterCitations) {
      try {
        const { data, error } = await supabase.functions.invoke('find-better-citations', {
          body: {
            articleTopic: article.headline,
            articleLanguage: article.language,
            articleContent: article.detailed_content,
            currentCitations: article.external_citations || [],
            focusArea: "authority",
            verifyUrls: true
          }
        });

        if (error) throw error;

        if (data?.citations && data.citations.length > 0) {
          // Merge with existing citations, replacing low-authority ones
          const existingCitations = (article.external_citations as any[]) || [];
          const newCitations = [...existingCitations.filter((c: any) => (c.authorityScore || 0) >= 70), ...data.citations];

          await supabase
            .from('blog_articles')
            .update({ external_citations: newCitations as any })
            .eq('id', article.id!);

          report.fixesApplied.push(`Replaced citations with ${data.citations.length} high-authority sources`);
        }
      } catch (err) {
        report.fixesFailed.push(`Citation replacement failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Fix 5: Add missing internal links
    const linkIssues = validationReport.sections.links.issues;
    const needsInternalLinks = linkIssues.some(
      issue => issue.includes("internal link")
    );

    if (needsInternalLinks) {
      try {
        const { data, error } = await supabase.functions.invoke('find-internal-links', {
          body: {
            content: article.detailed_content,
            headline: article.headline,
            currentArticleId: article.id,
            language: article.language,
            funnelStage: article.funnel_stage
          }
        });

        if (error) throw error;

        if (data?.suggestions && data.suggestions.length > 0) {
          // Take top 5 suggestions
          const topLinks = data.suggestions.slice(0, 5);
          
          await supabase
            .from('blog_articles')
            .update({ internal_links: topLinks as any })
            .eq('id', article.id!);

          report.fixesApplied.push(`Added ${topLinks.length} internal links`);
        }
      } catch (err) {
        report.fixesFailed.push(`Internal links failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Determine if still blocked
    report.stillBlocked = report.fixesFailed.length > 0 || 
      validationReport.blockers.some(b => 
        !b.includes("reviewer") && 
        !b.includes("H1") && 
        !b.includes("citation") && 
        !b.includes("internal link")
      );

  } catch (error) {
    report.error = error instanceof Error ? error.message : 'Unknown error';
    report.stillBlocked = true;
  }

  return report;
}

export async function autoFixBulkArticles(
  articles: BlogArticle[],
  validationResults: Map<string, PublishValidationReport>,
  defaultReviewerId: string,
  onProgress?: (current: number, total: number, currentArticle: string) => void
): Promise<AutoFixReport[]> {
  const reports: AutoFixReport[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const validation = validationResults.get(article.id!);

    if (!validation) continue;

    onProgress?.(i + 1, articles.length, article.headline);

    const report = await autoFixArticleIssues(article, validation, defaultReviewerId);
    reports.push(report);
  }

  return reports;
}
