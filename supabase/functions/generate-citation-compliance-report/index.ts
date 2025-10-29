import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isApprovedDomain, getDomainCategory, getAllApprovedDomains } from "../shared/approvedDomains.ts";
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

    console.log('📊 Generating citation compliance report...');

    // Fetch all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, external_citations, language, status')
      .eq('status', 'published');

    if (articlesError) throw articlesError;

    // Fetch citation health data
    const { data: healthData, error: healthError } = await supabase
      .from('external_citation_health')
      .select('*');

    if (healthError) throw healthError;

    // Fetch active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('citation_compliance_alerts')
      .select('*')
      .is('resolved_at', null);

    if (alertsError) throw alertsError;

    // Initialize counters
    let totalCitations = 0;
    let approvedCitations = 0;
    let nonApprovedCitations = 0;
    let competitorCitations = 0;
    let governmentSourcesCount = 0;
    let healthyCitations = 0;
    let brokenCitations = 0;
    let unreachableCitations = 0;

    const categoryCounts: Record<string, number> = {};
    const violations: Array<{
      articleId: string;
      articleTitle: string;
      articleSlug: string;
      citationUrl: string;
      violationType: string;
      severity: string;
      suggestedReplacement?: string;
    }> = [];

    // Analyze each article
    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      
      for (const citation of citations) {
        totalCitations++;
        const url = citation.url;

        // Check competitor (CRITICAL)
        if (isCompetitor(url)) {
          competitorCitations++;
          violations.push({
            articleId: article.id,
            articleTitle: article.headline,
            articleSlug: article.slug,
            citationUrl: url,
            violationType: 'competitor',
            severity: 'critical',
          });
          continue;
        }

        // Check approved
        if (isApprovedDomain(url)) {
          approvedCitations++;
          
          // Categorize
          const category = getDomainCategory(url);
          if (category) {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          }

          // Check if government source
          if (url.includes('.gov') || url.includes('.gob.')) {
            governmentSourcesCount++;
          }
        } else {
          nonApprovedCitations++;
          violations.push({
            articleId: article.id,
            articleTitle: article.headline,
            articleSlug: article.slug,
            citationUrl: url,
            violationType: 'non_approved',
            severity: 'warning',
          });
        }

        // Check health status
        const health = healthData?.find(h => h.url === url);
        if (health) {
          if (health.status === 'healthy') {
            healthyCitations++;
          } else if (health.status === 'broken') {
            brokenCitations++;
            violations.push({
              articleId: article.id,
              articleTitle: article.headline,
              articleSlug: article.slug,
              citationUrl: url,
              violationType: 'broken_link',
              severity: 'warning',
            });
          } else if (health.status === 'unreachable') {
            unreachableCitations++;
          }
        }
      }
    }

    // Calculate compliance score (0-100)
    const complianceScore = totalCitations > 0
      ? Math.round(((approvedCitations - competitorCitations) / totalCitations) * 100)
      : 100;

    // Generate category breakdown
    const byCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: totalCitations > 0 ? ((count / totalCitations) * 100).toFixed(1) : '0.0',
    })).sort((a, b) => b.count - a.count);

    // Generate recommendations
    const recommendations: string[] = [];

    if (competitorCitations > 0) {
      recommendations.push(`🚫 URGENT: Remove ${competitorCitations} competitor citations immediately`);
    }

    if (nonApprovedCitations > 0) {
      recommendations.push(`⚠️ Replace ${nonApprovedCitations} non-approved citations with approved domains`);
    }

    const govPercentage = totalCitations > 0 ? (governmentSourcesCount / totalCitations) * 100 : 0;
    if (govPercentage < 10) {
      const needed = Math.ceil((totalCitations * 0.1) - governmentSourcesCount);
      recommendations.push(`📊 Add ${needed} more government sources to reach 10% threshold (currently ${govPercentage.toFixed(1)}%)`);
    }

    if (brokenCitations > 0) {
      recommendations.push(`🔧 Fix ${brokenCitations} broken citations using auto-replacement`);
    }

    if (complianceScore < 90) {
      recommendations.push(`🎯 Improve compliance score from ${complianceScore}% to 90%+ for optimal E-E-A-T`);
    }

    // Build final report
    const report = {
      summary: {
        totalArticles: articles?.length || 0,
        totalCitations,
        approvedCitations,
        nonApprovedCitations,
        competitorCitations,
        governmentSourcesCount,
        healthyCitations,
        brokenCitations,
        unreachableCitations,
        complianceScore,
        governmentSourcePercentage: govPercentage.toFixed(1),
        activeAlerts: alerts?.length || 0,
      },
      byCategory,
      violations: violations.slice(0, 50), // Limit to top 50
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalApprovedDomains: getAllApprovedDomains().length,
        reportVersion: '1.0',
      },
    };

    console.log('✅ Report generated successfully');
    console.log(`📊 Compliance Score: ${complianceScore}%`);
    console.log(`🔗 ${approvedCitations}/${totalCitations} citations approved`);
    console.log(`🏛️ ${governmentSourcesCount} government sources (${govPercentage.toFixed(1)}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        report,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-citation-compliance-report:', error);
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
