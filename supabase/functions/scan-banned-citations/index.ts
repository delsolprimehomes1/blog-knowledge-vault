import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    console.log('🔍 Starting banned citation scan...');

    // Fetch all published articles with citations
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, external_citations, language, slug')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (articlesError) throw articlesError;

    console.log(`📚 Scanning ${articles?.length || 0} published articles...`);

    const violations: Array<{
      article_id: string;
      article_title: string;
      article_slug: string;
      citation_url: string;
      domain: string;
      language: string;
    }> = [];

    const domainCounts: Record<string, number> = {};
    let totalCitationsScanned = 0;

    // Scan each article
    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      
      for (const citation of citations) {
        totalCitationsScanned++;
        const url = citation.url;
        
        // Check if citation is from a banned competitor domain
        if (isCompetitor(url)) {
          const domain = new URL(url).hostname.replace('www.', '').toLowerCase();
          
          violations.push({
            article_id: article.id,
            article_title: article.headline,
            article_slug: article.slug,
            citation_url: url,
            domain,
            language: article.language,
          });

          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          
          console.log(`🚫 BANNED: "${article.headline}" cites ${domain}`);
        }
      }
    }

    // Create compliance alerts for violations
    if (violations.length > 0) {
      const alertsToCreate = violations.map(v => ({
        alert_type: 'competitor',
        severity: 'high',
        citation_url: v.citation_url,
        article_id: v.article_id,
        article_title: v.article_title,
        auto_suggested_replacement: null,
      }));

      const { error: insertError } = await supabase
        .from('citation_compliance_alerts')
        .upsert(alertsToCreate, {
          onConflict: 'article_id,citation_url,alert_type',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('Error creating alerts:', insertError);
      }
    }

    // Update citation health status for banned URLs
    if (violations.length > 0) {
      const uniqueUrls = [...new Set(violations.map(v => v.citation_url))];
      
      for (const url of uniqueUrls) {
        await supabase
          .from('external_citation_health')
          .upsert({
            url,
            status: 'competitor',
            last_checked_at: new Date().toISOString(),
            source_type: 'competitor',
          }, {
            onConflict: 'url',
            ignoreDuplicates: false,
          });
      }
    }

    const summary = {
      success: true,
      totalArticles: articles?.length || 0,
      totalCitationsScanned,
      bannedCitationsFound: violations.length,
      affectedArticles: new Set(violations.map(v => v.article_id)).size,
      violationsByDomain: domainCounts,
      violationsByLanguage: violations.reduce((acc, v) => {
        acc[v.language] = (acc[v.language] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topOffenders: Object.entries(domainCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count })),
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Scan complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scan-banned-citations:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
