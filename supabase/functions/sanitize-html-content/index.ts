import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COMPETITOR_DOMAINS } from "../shared/competitorBlacklist.ts";

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

    console.log('🧹 Starting HTML content sanitization...');

    // Fetch all published articles
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, detailed_content, external_citations')
      .eq('status', 'published');

    if (fetchError) throw fetchError;

    console.log(`📄 Scanning ${articles.length} published articles...`);

    const results = {
      totalScanned: articles.length,
      articlesWithHtmlViolations: 0,
      totalBannedLinksFound: 0,
      updates: [] as any[]
    };

    for (const article of articles) {
      let updatedContent = article.detailed_content;
      let foundInHtml = false;
      const bannedLinksInThisArticle: string[] = [];

      // Get banned URLs from external_citations
      const bannedUrlsInCitations = (article.external_citations || [])
        .filter((c: any) => {
          try {
            const hostname = new URL(c.url).hostname.replace('www.', '').toLowerCase();
            return COMPETITOR_DOMAINS.some(banned => 
              hostname.includes(banned) || banned.includes(hostname)
            );
          } catch {
            return false;
          }
        })
        .map((c: any) => c.url);

      // Search HTML for these specific URLs
      for (const bannedUrl of bannedUrlsInCitations) {
        const escapedUrl = bannedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hrefRegex = new RegExp(`href=[\\\"']${escapedUrl}[\\\"']`, 'gi');
        
        if (hrefRegex.test(updatedContent)) {
          foundInHtml = true;
          bannedLinksInThisArticle.push(bannedUrl);
          
          // Remove the entire <a> tag but keep anchor text
          updatedContent = updatedContent.replace(
            new RegExp(`<a[^>]*href=[\\\"']${escapedUrl}[\\\"'][^>]*>(.*?)</a>`, 'gi'),
            '$1' // Keep just the text content
          );
        }
      }

      if (foundInHtml) {
        results.totalBannedLinksFound += bannedLinksInThisArticle.length;
        
        // Update article
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ 
            detailed_content: updatedContent,
            date_modified: new Date().toISOString()
          })
          .eq('id', article.id);

        if (!updateError) {
          results.articlesWithHtmlViolations++;
          results.updates.push({
            article_id: article.id,
            slug: article.slug,
            banned_links_removed: bannedLinksInThisArticle.length,
            urls: bannedLinksInThisArticle
          });
          
          console.log(`✅ Cleaned ${article.slug}: removed ${bannedLinksInThisArticle.length} banned links`);
        } else {
          console.error(`❌ Failed to update ${article.slug}:`, updateError);
        }
      }
    }

    const summary = {
      success: true,
      ...results,
      message: `Sanitization complete. ${results.articlesWithHtmlViolations} articles updated, ${results.totalBannedLinksFound} banned links removed.`,
      timestamp: new Date().toISOString()
    };

    console.log('✅ HTML sanitization complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Sanitization error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
