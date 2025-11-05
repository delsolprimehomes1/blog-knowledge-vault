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
    const { articleId } = await req.json();

    if (!articleId) {
      throw new Error('articleId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔍 Validating citations for article: ${articleId}`);

    // Fetch article
    const { data: article, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, detailed_content, external_citations, language')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Failed to fetch article: ${fetchError?.message}`);
    }

    const violations: Array<{ url: string; location: string }> = [];

    // Scan HTML content for competitor links
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(article.detailed_content)) !== null) {
      const url = match[1];
      if (isCompetitor(url)) {
        violations.push({
          url,
          location: 'detailed_content'
        });
        console.log(`⚠️ Found banned link in content: ${url}`);
      }
    }

    // Scan structured citations
    if (article.external_citations && Array.isArray(article.external_citations)) {
      article.external_citations.forEach((cit: any) => {
        if (cit.url && isCompetitor(cit.url)) {
          violations.push({
            url: cit.url,
            location: 'external_citations'
          });
          console.log(`⚠️ Found banned citation in external_citations: ${cit.url}`);
        }
      });
    }

    // Create alerts for violations if found
    if (violations.length > 0) {
      console.log(`🚨 Creating ${violations.length} compliance alerts for article ${article.slug}`);

      // Delete existing unresolved alerts for this article to avoid duplicates
      await supabase
        .from('citation_compliance_alerts')
        .delete()
        .eq('article_id', articleId)
        .is('resolved_at', null);

      // Insert new alerts
      const alertsToInsert = violations.map(v => ({
        article_id: articleId,
        article_title: article.headline,
        citation_url: v.url,
        alert_type: 'competitor_citation',
        severity: 'high',
        detected_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('citation_compliance_alerts')
        .insert(alertsToInsert);

      if (insertError) {
        console.error('Failed to create alerts:', insertError);
      }

      // Update article to flag it has dead citations
      await supabase
        .from('blog_articles')
        .update({
          has_dead_citations: true,
          last_citation_check_at: new Date().toISOString()
        })
        .eq('id', articleId);
    } else {
      // No violations - update article as clean
      await supabase
        .from('blog_articles')
        .update({
          has_dead_citations: false,
          last_citation_check_at: new Date().toISOString()
        })
        .eq('id', articleId);
    }

    const summary = {
      articleId,
      articleSlug: article.slug,
      articleHeadline: article.headline,
      violations,
      violationCount: violations.length,
      isCompliant: violations.length === 0,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Validation complete: ${violations.length} violations found`);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in validate-article-citations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
