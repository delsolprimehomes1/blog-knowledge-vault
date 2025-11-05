import { isCompetitor, COMPETITOR_DOMAINS } from "./competitorBlacklist.ts";

/**
 * Remove competitor citations from HTML content
 * Strips <a href="..."> tags pointing to banned domains
 */
export function filterBannedCitations(htmlContent: string): {
  cleanedContent: string;
  removedCitations: string[];
  violationCount: number;
} {
  const removedCitations: string[] = [];
  
  // Match all <a href="URL"> tags
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  
  const cleanedContent = htmlContent.replace(linkRegex, (match, url, text) => {
    if (isCompetitor(url)) {
      console.log(`🚫 Filtered banned citation: ${url}`);
      removedCitations.push(url);
      // Remove the link but keep the text
      return text;
    }
    return match; // Keep valid links
  });
  
  return {
    cleanedContent,
    removedCitations,
    violationCount: removedCitations.length
  };
}

/**
 * Check if external_citations array contains banned domains
 * Used for structured citation validation
 */
export function validateExternalCitations(citations: Array<{ url: string }>): {
  validCitations: Array<{ url: string }>;
  invalidCitations: Array<{ url: string; reason: string }>;
} {
  const validCitations: Array<{ url: string }> = [];
  const invalidCitations: Array<{ url: string; reason: string }> = [];
  
  citations.forEach(citation => {
    if (isCompetitor(citation.url)) {
      invalidCitations.push({
        url: citation.url,
        reason: 'Competitor domain (blocked by citation policy)'
      });
    } else {
      validCitations.push(citation);
    }
  });
  
  return { validCitations, invalidCitations };
}

/**
 * Get list of all banned domains for AI prompt injection
 * Returns formatted string for system prompts
 */
export function getBannedDomainsPrompt(): string {
  return `
═══════════════════════════════════════════════════════════════
⚠️  CRITICAL CITATION POLICY - STRICTLY ENFORCED
═══════════════════════════════════════════════════════════════

The following ${COMPETITOR_DOMAINS.length} domains are ABSOLUTELY FORBIDDEN in citations:

${COMPETITOR_DOMAINS.slice(0, 30).map(d => `  ❌ ${d}`).join('\n')}
${COMPETITOR_DOMAINS.length > 30 ? `  ... and ${COMPETITOR_DOMAINS.length - 30} more banned domains` : ''}

🚫 RULES:
  • DO NOT cite, reference, or link to ANY of these domains
  • DO NOT include them in external_citations arrays
  • DO NOT mention them in article content
  • If you cannot find alternative sources, use [CITATION_NEEDED] markers
  
⚡ CONSEQUENCES:
  • Content with banned citations will be automatically filtered
  • Violations will trigger compliance alerts
  • Repeated violations may result in content rejection

✅ PREFERRED SOURCES:
  • Government websites (.gov, .gob)
  • Official statistics agencies
  • Academic institutions (.edu)
  • Industry associations
  • News organizations with high authority

═══════════════════════════════════════════════════════════════
`;
}
