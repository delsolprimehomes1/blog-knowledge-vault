import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  articleId: string;
  articleSlug: string;
  totalCitations: number;
  inlineMatches: number;
  paragraphTracking: number;
  brokenLinks: string[];
  competitorLinks: string[];
  missingInline: string[];
  validationStatus: 'pass' | 'warning' | 'fail';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { articleIds } = await req.json();
    console.log(`Validating inline citations for ${articleIds?.length || 'all'} articles`);

    // Fetch articles
    let articlesQuery = supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, external_citations, status')
      .eq('status', 'published');

    if (articleIds && articleIds.length > 0) {
      articlesQuery = articlesQuery.in('id', articleIds);
    }

    const { data: articles, error: articlesError } = await articlesQuery;

    if (articlesError) throw articlesError;

    const results: ValidationResult[] = [];

    for (const article of articles || []) {
      console.log(`Validating article: ${article.slug}`);

      // Fetch citation tracking records
      const { data: trackingRecords } = await supabase
        .from('citation_usage_tracking')
        .select('*')
        .eq('article_id', article.id)
        .eq('is_active', true);

      const result: ValidationResult = {
        articleId: article.id,
        articleSlug: article.slug,
        totalCitations: article.external_citations?.length || 0,
        inlineMatches: 0,
        paragraphTracking: 0,
        brokenLinks: [],
        competitorLinks: [],
        missingInline: [],
        validationStatus: 'pass',
      };

      // Check each citation
      for (const citation of article.external_citations || []) {
        // Check if citation URL appears in content
        if (article.detailed_content.includes(citation.url)) {
          result.inlineMatches++;
        } else {
          result.missingInline.push(citation.source);
        }

        // Check if citation has paragraph tracking
        const tracking = trackingRecords?.find(t => t.citation_url === citation.url);
        if (tracking?.context_paragraph_index !== null && tracking?.context_paragraph_index !== undefined) {
          result.paragraphTracking++;
        }

        // Validate URL accessibility
        try {
          const urlCheck = await fetch(citation.url, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          
          if (!urlCheck.ok) {
            result.brokenLinks.push(`${citation.source}: ${citation.url} (${urlCheck.status})`);
          }
        } catch (error) {
          result.brokenLinks.push(`${citation.source}: ${citation.url} (timeout/error)`);
        }

        // Check for competitor domains (basic check)
        const domain = new URL(citation.url).hostname;
        const competitorPatterns = ['competitor1.com', 'competitor2.com']; // Add actual competitors
        if (competitorPatterns.some(pattern => domain.includes(pattern))) {
          result.competitorLinks.push(citation.url);
        }
      }

      // Determine validation status
      if (result.brokenLinks.length > 0 || result.competitorLinks.length > 0) {
        result.validationStatus = 'fail';
      } else if (result.missingInline.length > 0 || result.paragraphTracking < result.totalCitations) {
        result.validationStatus = 'warning';
      }

      results.push(result);
    }

    // Generate summary
    const summary = {
      totalArticles: results.length,
      passed: results.filter(r => r.validationStatus === 'pass').length,
      warnings: results.filter(r => r.validationStatus === 'warning').length,
      failed: results.filter(r => r.validationStatus === 'fail').length,
      totalCitations: results.reduce((sum, r) => sum + r.totalCitations, 0),
      totalInlineMatches: results.reduce((sum, r) => sum + r.inlineMatches, 0),
      totalParagraphTracking: results.reduce((sum, r) => sum + r.paragraphTracking, 0),
      totalBrokenLinks: results.reduce((sum, r) => sum + r.brokenLinks.length, 0),
    };

    console.log('Validation complete:', summary);

    return new Response(
      JSON.stringify({ results, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
