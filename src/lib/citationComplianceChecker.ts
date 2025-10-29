import { isApprovedDomain } from './citationApprovalChecker';

export interface CitationComplianceResult {
  isCompliant: boolean;
  isApproved: boolean;
  isCompetitor: boolean;
  isAccessible: boolean | null;
  statusCode: number | null;
  severity: 'valid' | 'warning' | 'critical';
  message: string;
  category?: string;
}

// Competitor domains (real estate agencies, brokerages, property sellers)
const COMPETITOR_DOMAINS = [
  'kyero.com', 'idealista.com', 'rightmove.co.uk', 'zoopla.co.uk',
  'fotocasa.es', 'pisos.com', 'habitaclia.com', 'yaencontre.com',
  'engel-voelkers.com', 'sothebysrealty.com', 'knightfrank.com',
  'savills.com', 'christie.com', 'luxuryestate.com', 'jamesedition.com',
  'propertyinder.ae', 'bayut.com', 'zillow.com', 'realtor.com',
  'redfin.com', 'trulia.com', 'homes.com', 'century21.com',
  'coldwellbanker.com', 'remax.com', 'keller-williams.com',
  'compass.com', 'douglas-elliman.com', 'corcoran.com',
  'propertypal.com', 'myhome.ie', 'daft.ie', 'doomu.com',
  'thinkspain.com', 'spanishpropertyinsight.com', 'kyero.com',
  'costadelsolproperties.com', 'solmar-properties.com',
  'villas.com', 'luxury-retreats.com', 'homeaway.com', 'vrbo.com',
  // Add more competitor domains as needed
];

/**
 * Checks if a URL belongs to a competitor domain
 */
export const isCompetitorDomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace('www.', '');
    return COMPETITOR_DOMAINS.some(competitor => 
      hostname === competitor || hostname.endsWith('.' + competitor)
    );
  } catch {
    return false;
  }
};

/**
 * Validates citation compliance in real-time
 */
export const validateCitationCompliance = async (url: string): Promise<CitationComplianceResult> => {
  // Basic URL validation
  if (!url || url.trim() === '') {
    return {
      isCompliant: false,
      isApproved: false,
      isCompetitor: false,
      isAccessible: null,
      statusCode: null,
      severity: 'critical',
      message: 'URL is required',
    };
  }

  try {
    new URL(url); // Validate URL format
  } catch {
    return {
      isCompliant: false,
      isApproved: false,
      isCompetitor: false,
      isAccessible: null,
      statusCode: null,
      severity: 'critical',
      message: 'Invalid URL format',
    };
  }

  // Check if competitor (CRITICAL - must block)
  const isCompetitor = isCompetitorDomain(url);
  if (isCompetitor) {
    return {
      isCompliant: false,
      isApproved: false,
      isCompetitor: true,
      isAccessible: null,
      statusCode: null,
      severity: 'critical',
      message: '🚫 Competitor domain blocked - Never use links from real estate agencies or property sellers',
    };
  }

  // Check if approved domain
  const isApproved = isApprovedDomain(url);
  if (!isApproved) {
    return {
      isCompliant: false,
      isApproved: false,
      isCompetitor: false,
      isAccessible: null,
      statusCode: null,
      severity: 'warning',
      message: '⚠️ Not in approved domains list - Contact admin to request approval',
    };
  }

  // Check URL accessibility (optional, can be slow)
  // For now, we'll skip this in real-time validation and only do it server-side
  // to keep the UI fast and responsive

  return {
    isCompliant: true,
    isApproved: true,
    isCompetitor: false,
    isAccessible: null, // Will be checked server-side
    statusCode: null,
    severity: 'valid',
    message: '✅ Approved domain - Citation is compliant',
  };
};

/**
 * Batch validate multiple citations
 */
export const validateCitationsBatch = async (urls: string[]): Promise<Record<string, CitationComplianceResult>> => {
  const results: Record<string, CitationComplianceResult> = {};
  
  for (const url of urls) {
    if (url && url.trim()) {
      results[url] = await validateCitationCompliance(url);
    }
  }
  
  return results;
};

/**
 * Get compliance summary for an article
 */
export interface ComplianceSummary {
  totalCitations: number;
  compliantCitations: number;
  competitorCitations: number;
  nonApprovedCitations: number;
  governmentSources: number;
  complianceScore: number; // 0-100
  criticalIssues: number;
  warnings: number;
}

export const getComplianceSummary = async (citations: Array<{ url: string }>): Promise<ComplianceSummary> => {
  const results = await validateCitationsBatch(citations.map(c => c.url));
  
  const totalCitations = citations.length;
  const compliantCitations = Object.values(results).filter(r => r.isCompliant).length;
  const competitorCitations = Object.values(results).filter(r => r.isCompetitor).length;
  const nonApprovedCitations = Object.values(results).filter(r => !r.isApproved && !r.isCompetitor).length;
  const governmentSources = citations.filter(c => 
    c.url.includes('.gov') || c.url.includes('.gob.')
  ).length;
  const criticalIssues = Object.values(results).filter(r => r.severity === 'critical').length;
  const warnings = Object.values(results).filter(r => r.severity === 'warning').length;
  
  const complianceScore = totalCitations > 0 
    ? Math.round((compliantCitations / totalCitations) * 100)
    : 100;
  
  return {
    totalCitations,
    compliantCitations,
    competitorCitations,
    nonApprovedCitations,
    governmentSources,
    complianceScore,
    criticalIssues,
    warnings,
  };
};
