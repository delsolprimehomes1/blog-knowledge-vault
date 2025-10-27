export interface CitationValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: CitationIssue[];
  hasUnreplacedMarkers: boolean;
  officialSourceCount: number;
  totalCitations: number;
}

export interface CitationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Validates citation quality in article content
 */
export function validateCitations(
  content: string,
  externalCitations: any[],
  language: string
): CitationValidationResult {
  const issues: CitationIssue[] = [];
  let score = 100;

  // Check for unreplaced [CITATION_NEEDED] markers
  const markerCount = (content.match(/\[CITATION_NEEDED\]/g) || []).length;
  const hasUnreplacedMarkers = markerCount > 0;

  if (hasUnreplacedMarkers) {
    issues.push({
      type: 'error',
      message: `${markerCount} citation marker${markerCount !== 1 ? 's' : ''} need${markerCount === 1 ? 's' : ''} to be replaced with sources`,
      severity: 'critical'
    });
    score -= markerCount * 15; // -15 points per unreplaced marker
  }

  // Extract inline citations from content
  const inlineCitationRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>.*?<\/a>/gi;
  const inlineCitations = Array.from(content.matchAll(inlineCitationRegex), m => m[1]);
  
  const totalCitations = inlineCitations.length + (externalCitations?.length || 0);
  const officialSourceCount = countOfficialSources(inlineCitations, externalCitations, language);

  // Validate citation count
  if (totalCitations === 0) {
    issues.push({
      type: 'error',
      message: 'No citations found - article needs authoritative sources',
      severity: 'critical'
    });
    score -= 40;
  } else if (totalCitations < 3) {
    issues.push({
      type: 'warning',
      message: `Only ${totalCitations} citation${totalCitations !== 1 ? 's' : ''} - aim for at least 3-5 authoritative sources`,
      severity: 'medium'
    });
    score -= 15;
  }

  // Validate official sources
  if (officialSourceCount === 0 && totalCitations > 0) {
    issues.push({
      type: 'warning',
      message: 'No official government or institutional sources (.gov, .gob.es, .edu) found',
      severity: 'high'
    });
    score -= 20;
  } else if (officialSourceCount < 2 && totalCitations >= 3) {
    issues.push({
      type: 'info',
      message: `Consider adding more official sources (currently ${officialSourceCount})`,
      severity: 'low'
    });
    score -= 5;
  }

  // Check for broken links (basic validation)
  const suspiciousDomains = ['example.com', 'test.com', 'placeholder.com', 'lorem.ipsum'];
  inlineCitations.forEach(url => {
    if (suspiciousDomains.some(domain => url.includes(domain))) {
      issues.push({
        type: 'error',
        message: `Suspicious citation URL detected: ${url}`,
        severity: 'high'
      });
      score -= 10;
    }
  });

  // Validate language-specific domains
  const languageMismatch = checkLanguageMismatch(inlineCitations, externalCitations, language);
  if (languageMismatch.count > 0) {
    issues.push({
      type: 'warning',
      message: `${languageMismatch.count} citation${languageMismatch.count !== 1 ? 's' : ''} may not match article language (${language.toUpperCase()})`,
      severity: 'medium'
    });
    score -= languageMismatch.count * 5;
  }

  // Ensure score stays in 0-100 range
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: score >= 70 && !hasUnreplacedMarkers,
    score,
    issues,
    hasUnreplacedMarkers,
    officialSourceCount,
    totalCitations
  };
}

/**
 * Count official government/institutional sources
 */
function countOfficialSources(
  inlineCitations: string[],
  externalCitations: any[],
  language: string
): number {
  const officialTLDs = ['.gov', '.gob.es', '.edu', '.gob', '.europa.eu'];
  
  let count = 0;

  // Check inline citations
  inlineCitations.forEach(url => {
    if (officialTLDs.some(tld => url.includes(tld))) {
      count++;
    }
  });

  // Check external citations
  externalCitations?.forEach((citation: any) => {
    if (citation.url && officialTLDs.some(tld => citation.url.includes(tld))) {
      count++;
    }
  });

  return count;
}

/**
 * Check if citations match article language
 */
function checkLanguageMismatch(
  inlineCitations: string[],
  externalCitations: any[],
  language: string
): { count: number; mismatches: string[] } {
  const languageTLDs: Record<string, string[]> = {
    'en': ['.com', '.org', '.gov', '.uk'],
    'de': ['.de'],
    'nl': ['.nl'],
    'fr': ['.fr'],
    'pl': ['.pl'],
    'sv': ['.se'],
    'da': ['.dk'],
    'hu': ['.hu']
  };

  const expectedTLDs = languageTLDs[language] || [];
  const mismatches: string[] = [];

  // Check inline citations
  inlineCitations.forEach(url => {
    const matches = expectedTLDs.some(tld => url.toLowerCase().includes(tld));
    // Also allow official TLDs regardless of language
    const isOfficial = ['.gov', '.gob', '.edu', '.europa.eu'].some(tld => url.includes(tld));
    
    if (!matches && !isOfficial) {
      mismatches.push(url);
    }
  });

  // Check external citations
  externalCitations?.forEach((citation: any) => {
    if (citation.url) {
      const matches = expectedTLDs.some(tld => citation.url.toLowerCase().includes(tld));
      const isOfficial = ['.gov', '.gob', '.edu', '.europa.eu'].some(tld => citation.url.includes(tld));
      
      if (!matches && !isOfficial) {
        mismatches.push(citation.url);
      }
    }
  });

  return {
    count: mismatches.length,
    mismatches
  };
}

/**
 * Get citation badge variant based on validation score
 */
export function getCitationBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 90) return 'default';
  if (score >= 70) return 'secondary';
  if (score >= 50) return 'outline';
  return 'destructive';
}

/**
 * Get citation status label
 */
export function getCitationStatusLabel(result: CitationValidationResult): string {
  if (result.hasUnreplacedMarkers) {
    return 'Citations Needed';
  }
  if (result.score >= 90) {
    return 'Excellent';
  }
  if (result.score >= 70) {
    return 'Good';
  }
  if (result.score >= 50) {
    return 'Needs Work';
  }
  return 'Poor';
}
