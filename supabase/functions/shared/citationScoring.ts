import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export interface CitationScore {
  url: string;
  domain: string;
  relevanceScore: number; // 0-100 from Perplexity
  trustScore: number; // 1-100 from approved_domains
  noveltyBoost: number; // +20 if domain_use_count < 5, +10 if < 10, else 0
  overusePenalty: number; // domain_use_count * 1.5
  finalScore: number; // relevance + (trust/10) + novelty - penalty
  domainUseCount: number;
  isOverused: boolean; // >50 uses
  isCriticalOveruse: boolean; // >100 uses
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export async function calculateCitationScore(
  url: string,
  relevanceScore: number,
  articleId: string,
  supabaseClient: SupabaseClient
): Promise<CitationScore> {
  const domain = extractDomain(url);
  
  // Get trust score from approved_domains
  const { data: approvedData } = await supabaseClient
    .from('approved_domains')
    .select('trust_score')
    .eq('domain', domain)
    .eq('is_allowed', true)
    .single();
  
  const trustScore = approvedData?.trust_score || 50;
  
  // Get usage stats
  const { data: usageData } = await supabaseClient
    .from('domain_usage_stats')
    .select('total_uses')
    .eq('domain', domain)
    .single();
  
  const domainUseCount = usageData?.total_uses || 0;
  
  // Calculate components
  const noveltyBoost = domainUseCount < 5 ? 20 : domainUseCount < 10 ? 10 : 0;
  const overusePenalty = domainUseCount * 1.5;
  const finalScore = relevanceScore + (trustScore / 10) + noveltyBoost - overusePenalty;
  
  return {
    url,
    domain,
    relevanceScore,
    trustScore,
    noveltyBoost,
    overusePenalty,
    finalScore,
    domainUseCount,
    isOverused: domainUseCount > 50,
    isCriticalOveruse: domainUseCount > 100
  };
}

export function enforceDomainDiversity<T extends { score: CitationScore }>(
  citations: T[],
  maxResults: number = 5
): T[] {
  const diversified: T[] = [];
  const usedDomains = new Set<string>();
  
  for (const citation of citations) {
    if (!usedDomains.has(citation.score.domain)) {
      diversified.push(citation);
      usedDomains.add(citation.score.domain);
    }
    if (diversified.length >= maxResults) break;
  }
  
  return diversified;
}

export async function logCitationScore(
  score: CitationScore,
  articleId: string,
  wasSelected: boolean,
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    await supabaseClient.from('citation_scoring_log').insert({
      article_id: articleId,
      citation_url: score.url,
      domain: score.domain,
      relevance_score: score.relevanceScore,
      trust_score: score.trustScore,
      novelty_boost: score.noveltyBoost,
      overuse_penalty: score.overusePenalty,
      final_score: score.finalScore,
      was_selected: wasSelected
    });
  } catch (error) {
    console.error('Error logging citation score:', error);
  }
}
