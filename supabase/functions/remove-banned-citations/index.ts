import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isCompetitor } from "../shared/competitorBlacklist.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting banned citation removal process...');

    // Fetch all published articles with external citations
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, external_citations')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`Found ${articles?.length || 0} articles to scan`);

    const removalStats = {
      articlesScanned: articles?.length || 0,
      articlesModified: 0,
      citationsRemoved: 0,
      byDomain: {} as Record<string, number>,
      affectedArticles: [] as Array<{ slug: string; headline: string; removedCount: number }>,
    };

    // Process each article
    for (const article of articles || []) {
      let hasChanges = false;
      let removedCount = 0;
      const bannedUrls: string[] = [];

      // Filter external_citations array
      const originalCitations = Array.isArray(article.external_citations) 
        ? article.external_citations 
        : [];
      
      const cleanedCitations = originalCitations.filter((citation: any) => {
        const url = citation?.url || '';
        if (isCompetitor(url)) {
          bannedUrls.push(url);
          removedCount++;
          
          // Track by domain
          const domain = extractDomain(url);
          removalStats.byDomain[domain] = (removalStats.byDomain[domain] || 0) + 1;
          
          return false; // Remove this citation
        }
        return true; // Keep this citation
      });

      if (removedCount > 0) {
        hasChanges = true;
        removalStats.citationsRemoved += removedCount;
      }

      // Clean HTML content - remove <a> tags for banned URLs
      let cleanedContent = article.detailed_content || '';
      for (const bannedUrl of bannedUrls) {
        const escapedUrl = bannedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match <a href="url">text</a> and replace with just text
        const regex = new RegExp(`<a[^>]*href=["']${escapedUrl}["'][^>]*>(.*?)</a>`, 'gi');
        const beforeReplace = cleanedContent;
        cleanedContent = cleanedContent.replace(regex, '$1');
        if (beforeReplace !== cleanedContent) {
          hasChanges = true;
        }
      }

      // Update article if changes were made
      if (hasChanges) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            external_citations: cleanedCitations,
            detailed_content: cleanedContent,
            date_modified: new Date().toISOString(),
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`Failed to update article ${article.slug}:`, updateError);
          continue;
        }

        // Delete citation tracking records for banned URLs
        for (const bannedUrl of bannedUrls) {
          await supabase
            .from('citation_usage_tracking')
            .delete()
            .eq('article_id', article.id)
            .eq('citation_url', bannedUrl);
        }

        removalStats.articlesModified++;
        removalStats.affectedArticles.push({
          slug: article.slug,
          headline: article.headline,
          removedCount,
        });

        console.log(`✓ Cleaned ${removedCount} citations from: ${article.slug}`);
      }
    }

    // Sort domains by frequency
    const topOffenders = Object.entries(removalStats.byDomain)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    console.log('Removal complete:', {
      articlesModified: removalStats.articlesModified,
      citationsRemoved: removalStats.citationsRemoved,
      topOffenders: topOffenders.map(([domain, count]) => `${domain}: ${count}`),
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          ...removalStats,
          topOffenders: topOffenders.map(([domain, count]) => ({ domain, count })),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in remove-banned-citations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
