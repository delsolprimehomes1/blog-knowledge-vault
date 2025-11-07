import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of stale citation alerts...');

    // Fetch all unresolved alerts
    const { data: unresolvedAlerts, error: alertsError } = await supabaseClient
      .from('citation_compliance_alerts')
      .select('id, article_id, citation_url')
      .is('resolved_at', null);

    if (alertsError) throw alertsError;

    console.log(`Found ${unresolvedAlerts?.length || 0} unresolved alerts`);

    if (!unresolvedAlerts || unresolvedAlerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stale alerts to clean up',
          resolved_count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all articles with their external citations
    const { data: articles, error: articlesError } = await supabaseClient
      .from('blog_articles')
      .select('id, external_citations');

    if (articlesError) throw articlesError;

    // Create a map of article_id -> array of citation URLs
    const articleCitationMap = new Map<string, string[]>();
    articles?.forEach((article: any) => {
      const citations = article.external_citations || [];
      const urls = citations.map((c: any) => c.url).filter(Boolean);
      articleCitationMap.set(article.id, urls);
    });

    // Find stale alerts (citation no longer exists in article)
    const staleAlertIds: string[] = [];
    
    for (const alert of unresolvedAlerts) {
      const articleCitations = articleCitationMap.get(alert.article_id) || [];
      const citationStillExists = articleCitations.includes(alert.citation_url);
      
      if (!citationStillExists) {
        staleAlertIds.push(alert.id);
      }
    }

    console.log(`Found ${staleAlertIds.length} stale alerts to resolve`);

    if (staleAlertIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stale alerts found - all alerts are current',
          resolved_count: 0,
          total_checked: unresolvedAlerts.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark stale alerts as resolved
    const { error: updateError } = await supabaseClient
      .from('citation_compliance_alerts')
      .update({ 
        resolved_at: new Date().toISOString(),
        resolution_notes: 'Auto-resolved: Citation no longer exists in article (likely replaced or removed)'
      })
      .in('id', staleAlertIds);

    if (updateError) throw updateError;

    console.log(`Successfully resolved ${staleAlertIds.length} stale alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully resolved ${staleAlertIds.length} stale alerts`,
        resolved_count: staleAlertIds.length,
        total_checked: unresolvedAlerts.length,
        remaining_alerts: unresolvedAlerts.length - staleAlertIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error cleaning up stale alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
