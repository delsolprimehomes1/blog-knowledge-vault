import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export async function getArticleUsedDomains(supabaseClient: SupabaseClient, articleId: string): Promise<string[]> {
  try {
    const { data } = await supabaseClient.from('citation_usage_tracking').select('citation_domain').eq('article_id', articleId).eq('is_active', true);
    return [...new Set(data?.map((d: any) => d.citation_domain).filter(Boolean) || [])];
  } catch { return []; }
}

export async function getUnderutilizedDomains(supabaseClient: SupabaseClient, limit = 100): Promise<string[]> {
  try {
    const { data } = await supabaseClient.from('domain_usage_stats').select('domain').order('total_uses', { ascending: true }).limit(limit);
    return data?.map((d: any) => d.domain) || [];
  } catch { return []; }
}

export async function getOverusedDomains(
  supabaseClient: SupabaseClient,
  threshold: number = 30
): Promise<string[]> {
  try {
    const { data } = await supabaseClient
      .from('domain_usage_stats')
      .select('domain')
      .gte('total_uses', threshold)
      .order('total_uses', { ascending: false });
    return data?.map((d: any) => d.domain) || [];
  } catch { return []; }
}

export async function getRecentlyUsedDomains(
  supabaseClient: SupabaseClient,
  currentArticleId: string,
  lookbackCount: number = 5
): Promise<string[]> {
  try {
    // Get last N published articles (excluding current)
    const { data: recentArticles } = await supabaseClient
      .from('blog_articles')
      .select('id')
      .eq('status', 'published')
      .neq('id', currentArticleId)
      .order('date_published', { ascending: false })
      .limit(lookbackCount);
    
    if (!recentArticles || recentArticles.length === 0) return [];
    
    const articleIds = recentArticles.map(a => a.id);
    
    // Get all domains used in these articles
    const { data: usedDomains } = await supabaseClient
      .from('citation_usage_tracking')
      .select('citation_domain')
      .in('article_id', articleIds)
      .eq('is_active', true);
    
    return [...new Set(usedDomains?.map(d => d.citation_domain).filter(Boolean) || [])];
  } catch (error) {
    console.error('Error fetching recently used domains:', error);
    return [];
  }
}

export function filterAndPrioritizeDomains(
  allDomains: string[], 
  usedInArticle: string[], 
  recentlyUsed: string[],
  underutilized: string[],
  overusedDomains: string[] = []
): string[] {
  // Priority 1: Never used in current article OR recent articles AND not overused globally
  const neverUsed = allDomains.filter(d => 
    !usedInArticle.includes(d) && 
    !recentlyUsed.includes(d) &&
    !overusedDomains.includes(d)
  );
  
  // Priority 2: Not used in current article (but maybe used recently) AND not overused globally
  const currentlyFresh = allDomains.filter(d => 
    !usedInArticle.includes(d) && 
    recentlyUsed.includes(d) &&
    !overusedDomains.includes(d)
  );
  
  // Sort both groups by underutilization score
  const sortByUnderutilized = (domains: string[]) => 
    domains.sort((a, b) => {
      const aScore = underutilized.includes(a) ? 1 : 0;
      const bScore = underutilized.includes(b) ? 1 : 0;
      return bScore - aScore;
    });
  
  return [
    ...sortByUnderutilized(neverUsed),
    ...sortByUnderutilized(currentlyFresh)
  ];
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

/**
 * Build a batch of 15-20 underutilized domains for Perplexity
 * Prioritizes domains with <3 uses to ensure minimum coverage
 */
export async function buildUnderutilizedBatch(
  supabaseClient: SupabaseClient,
  articleId: string,
  batchSize: number = 20
): Promise<{
  domains: string[];
  stats: {
    zeroUse: number;
    minimalUse: number; // 1-2 uses
    freshUse: number;   // 3-19 uses
  };
}> {
  // Get all approved domains
  const { data: approvedData } = await supabaseClient
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', true);
  
  const allApproved = approvedData?.map(d => d.domain) || [];
  
  // Get current usage stats
  const { data: usageData } = await supabaseClient
    .from('domain_usage_stats')
    .select('domain, total_uses')
    .order('total_uses', { ascending: true });
  
  const usageMap = new Map(
    usageData?.map(d => [d.domain, d.total_uses]) || []
  );
  
  // Get domains already used in this article (avoid duplicates)
  const usedInArticle = await getArticleUsedDomains(supabaseClient, articleId);
  
  // Get domains used in last 3 articles (for rotation)
  const recentlyUsed = await getRecentlyUsedDomains(supabaseClient, articleId, 3);
  
  // Categorize all approved domains by usage
  const zeroUse: string[] = [];
  const minimalUse: string[] = [];  // 1-2 uses
  const freshUse: string[] = [];     // 3-19 uses
  
  for (const domain of allApproved) {
    if (usedInArticle.includes(domain)) continue; // Skip if already in article
    if (recentlyUsed.includes(domain)) continue;  // Skip if used recently
    
    const uses = usageMap.get(domain) || 0;
    
    if (uses === 0) {
      zeroUse.push(domain);
    } else if (uses <= 2) {
      minimalUse.push(domain);
    } else if (uses < 20) {
      freshUse.push(domain);
    }
    // Ignore domains with 20+ uses for this priority batch
  }
  
  // Build batch: prioritize ultra-low usage first
  const batch: string[] = [];
  
  // Phase 1: Add all zero-use domains (up to batchSize/2)
  const zeroUseSample = zeroUse.slice(0, Math.floor(batchSize / 2));
  batch.push(...zeroUseSample);
  
  // Phase 2: Fill remaining with 1-2 use domains
  const remaining = batchSize - batch.length;
  const minimalUseSample = minimalUse.slice(0, Math.ceil(remaining / 2));
  batch.push(...minimalUseSample);
  
  // Phase 3: Top off with 3-19 use domains if needed
  if (batch.length < batchSize) {
    const freshSample = freshUse.slice(0, batchSize - batch.length);
    batch.push(...freshSample);
  }
  
  console.log(`📦 Built underutilized batch: ${batch.length} domains (${zeroUseSample.length} zero-use, ${minimalUseSample.length} minimal-use, ${batch.length - zeroUseSample.length - minimalUseSample.length} fresh)`);
  
  return {
    domains: batch,
    stats: {
      zeroUse: zeroUse.length,
      minimalUse: minimalUse.length,
      freshUse: freshUse.length
    }
  };
}

export async function recordDomainUsage(supabaseClient: SupabaseClient, articleId: string, citationUrl: string, citationSource: string): Promise<void> {
  try {
    await supabaseClient.from('citation_usage_tracking').insert({
      article_id: articleId,
      citation_url: citationUrl,
      citation_domain: extractDomain(citationUrl),
      citation_source: citationSource,
      is_active: true
    });
  } catch (error) {
    console.error('Error recording domain usage:', error);
  }
}
