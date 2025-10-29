import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isApprovedDomain } from "../shared/approvedDomains.ts";
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

    console.log('🔍 Starting citation compliance monitoring...');

    // Fetch all published articles with citations
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, external_citations, language')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (articlesError) throw articlesError;

    console.log(`📚 Found ${articles?.length || 0} published articles to check`);

    const alertsToCreate: Array<{
      alert_type: string;
      severity: string;
      citation_url: string;
      article_id: string;
      article_title: string;
      auto_suggested_replacement: string | null;
    }> = [];

    let competitorFound = 0;
    let nonApprovedFound = 0;
    let missingGovSources = 0;

    // Check each article
    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      let hasGovSource = false;

      for (const citation of citations) {
        const url = citation.url;
        
        // Check for competitor citations (CRITICAL)
        if (isCompetitor(url)) {
          competitorFound++;
          alertsToCreate.push({
            alert_type: 'competitor',
            severity: 'critical',
            citation_url: url,
            article_id: article.id,
            article_title: article.headline,
            auto_suggested_replacement: null,
          });
          console.log(`🚫 CRITICAL: Competitor citation found in "${article.headline}": ${url}`);
        }
        // Check for non-approved domains
        else if (!isApprovedDomain(url)) {
          nonApprovedFound++;
          alertsToCreate.push({
            alert_type: 'non_approved',
            severity: 'warning',
            citation_url: url,
            article_id: article.id,
            article_title: article.headline,
            auto_suggested_replacement: null,
          });
          console.log(`⚠️ Non-approved citation in "${article.headline}": ${url}`);
        }

        // Track government sources
        if (url.includes('.gov') || url.includes('.gob.')) {
          hasGovSource = true;
        }
      }

      // Alert if no government source (INFO level)
      if (citations.length > 0 && !hasGovSource) {
        missingGovSources++;
        alertsToCreate.push({
          alert_type: 'missing_gov_source',
          severity: 'info',
          citation_url: '',
          article_id: article.id,
          article_title: article.headline,
          auto_suggested_replacement: null,
        });
      }
    }

    // Check for broken citations from external_citation_health table
    const { data: brokenCitations, error: brokenError } = await supabase
      .from('external_citation_health')
      .select('url')
      .in('status', ['broken', 'unreachable']);

    if (brokenError) throw brokenError;

    // Match broken citations to articles
    for (const broken of brokenCitations || []) {
      const affectedArticles = articles?.filter(article => {
        const citations = (article.external_citations as any[]) || [];
        return citations.some((c: any) => c.url === broken.url);
      }) || [];

      for (const article of affectedArticles) {
        alertsToCreate.push({
          alert_type: 'broken_link',
          severity: 'warning',
          citation_url: broken.url,
          article_id: article.id,
          article_title: article.headline,
          auto_suggested_replacement: null,
        });
      }
    }

    // Remove duplicate alerts (same article + citation combination)
    const uniqueAlerts = alertsToCreate.filter((alert, index, self) => 
      index === self.findIndex(a => 
        a.article_id === alert.article_id && 
        a.citation_url === alert.citation_url &&
        a.alert_type === alert.alert_type
      )
    );

    console.log(`📊 Creating ${uniqueAlerts.length} unique alerts...`);

    // Clear old unresolved alerts before inserting new ones
    const { error: deleteError } = await supabase
      .from('citation_compliance_alerts')
      .delete()
      .is('resolved_at', null);

    if (deleteError) {
      console.error('Error clearing old alerts:', deleteError);
    }

    // Insert new alerts
    if (uniqueAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from('citation_compliance_alerts')
        .insert(uniqueAlerts);

      if (insertError) throw insertError;
    }

    const summary = {
      success: true,
      articlesChecked: articles?.length || 0,
      alertsCreated: uniqueAlerts.length,
      competitorCitations: competitorFound,
      nonApprovedCitations: nonApprovedFound,
      missingGovSources,
      brokenLinks: brokenCitations?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Monitoring complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in monitor-citation-compliance:', error);
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
