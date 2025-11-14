/**
 * Domain Rotation & Diversity System
 * 
 * Ensures citations use diverse domains across articles by:
 * 1. Tracking which domains are already used in each article
 * 2. Prioritizing globally underutilized domains
 * 3. Preventing repetitive citation sources
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export interface DomainUsageInfo {
  domain: string;
  usedInArticle: boolean;
  globalUseCount: number;
  lastUsedAt: string | null;
  tier: string;
}

/**
 * Get domains already used in a specific article
 */
export async function getArticleUsedDomains(
  supabaseClient: SupabaseClient,
  articleId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient
      .from('citation_usage_tracking')
      .select('citation_domain')
      .eq('article_id', articleId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching article domains:', error);
      return [];
    }
    
    // Return unique domains
    return [...new Set(data.map((d: any) => d.citation_domain).filter(Boolean))];
  } catch (error) {
    console.error('Exception in getArticleUsedDomains:', error);
    return [];
  }
}

/**
 * Get globally underutilized domains (prioritize least-used)
 */
export async function getUnderutilizedDomains(
  supabaseClient: SupabaseClient,
  limit: number = 100
): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient
      .from('domain_usage_stats')
      .select('domain')
      .order('total_uses', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching underutilized domains:', error);
      return [];
    }
    
    return data.map((d: any) => d.domain);
  } catch (error) {
    console.error('Exception in getUnderutilizedDomains:', error);
    return [];
  }
}

/**
 * Filter domains to exclude already-used and prioritize fresh ones
 */
export function filterAndPrioritizeDomains(
  allDomains: string[],
  usedInArticle: string[],
  underutilized: string[]
): string[] {
  // Step 1: Exclude domains already used in this article
  const availableDomains = allDomains.filter(
    d => !usedInArticle.includes(d)
  );
  
  // Step 2: Sort by priority - underutilized first
  const prioritized = availableDomains.sort((a, b) => {
    const aIsUnderutilized = underutilized.includes(a);
    const bIsUnderutilized = underutilized.includes(b);
    
    if (aIsUnderutilized && !bIsUnderutilized) return -1;
    if (!aIsUnderutilized && bIsUnderutilized) return 1;
    return 0;
  });
  
  return prioritized;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    // Fallback regex if URL parsing fails
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

/**
 * Record domain usage for an article
 */
export async function recordDomainUsage(
  supabaseClient: SupabaseClient,
  articleId: string,
  citationUrl: string,
  citationSource: string
): Promise<void> {
  try {
    const domain = extractDomain(citationUrl);
    
    await supabaseClient
      .from('citation_usage_tracking')
      .insert({
        article_id: articleId,
        citation_url: citationUrl,
        citation_domain: domain,
        citation_source: citationSource,
        first_added_at: new Date().toISOString(),
        is_active: true
      });
    
    console.log(`✓ Recorded domain usage: ${domain} for article ${articleId.substring(0, 8)}`);
  } catch (error) {
    console.error('Error recording domain usage:', error);
    // Don't throw - this is non-critical tracking
  }
}
