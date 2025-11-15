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
  underutilized: string[]
): string[] {
  // Priority 1: Never used in current article OR recent articles
  const neverUsed = allDomains.filter(d => 
    !usedInArticle.includes(d) && !recentlyUsed.includes(d)
  );
  
  // Priority 2: Not used in current article (but maybe used recently)
  const currentlyFresh = allDomains.filter(d => 
    !usedInArticle.includes(d) && recentlyUsed.includes(d)
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
