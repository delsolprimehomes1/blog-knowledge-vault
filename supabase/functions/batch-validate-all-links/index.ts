// Batch validate all published articles for link health

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  articleId: string;
  articleSlug: string;
  brokenLinksCount: number;
  languageMismatchCount: number;
  irrelevantLinksCount: number;
  linkDepth: number;
  hasValidation: boolean;
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

    console.log('Starting batch validation of all published articles...');

    // Fetch all published articles
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, language, detailed_content, internal_links, external_citations')
      .eq('status', 'published');

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`Found ${articles?.length || 0} published articles to validate`);

    const results: ValidationResult[] = [];
    let processedCount = 0;

    // Process each article
    for (const article of articles || []) {
      try {
        // Call existing validate-article-links function
        const { data: validation, error: validationError } = await supabase.functions.invoke(
          'validate-article-links',
          {
            body: {
              articleId: article.id,
              skipPerplexity: true, // Skip for batch to save API calls
              verifyUrls: true,
            },
          }
        );

        if (!validationError && validation) {
          results.push({
            articleId: article.id,
            articleSlug: article.slug,
            brokenLinksCount: validation.brokenLinksCount || 0,
            languageMismatchCount: validation.languageMismatchCount || 0,
            irrelevantLinksCount: validation.irrelevantLinksCount || 0,
            linkDepth: 2, // Default, will be calculated separately
            hasValidation: true,
          });

          // Update last_link_validation timestamp
          await supabase
            .from('blog_articles')
            .update({ last_link_validation: new Date().toISOString() })
            .eq('id', article.id);

          // Create alerts for critical issues
          if (validation.brokenLinksCount > 5) {
            await supabase.from('link_validation_alerts').insert({
              alert_type: 'broken_links',
              article_id: article.id,
              severity: 'critical',
              message: `Article has ${validation.brokenLinksCount} broken links`,
              details: { validation },
            });
          }
        }

        processedCount++;

        // Rate limiting: wait 500ms between requests
        if (processedCount < articles.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Failed to validate article ${article.slug}:`, error);
        results.push({
          articleId: article.id,
          articleSlug: article.slug,
          brokenLinksCount: 0,
          languageMismatchCount: 0,
          irrelevantLinksCount: 0,
          linkDepth: 2,
          hasValidation: false,
        });
      }
    }

    // Generate summary
    const summary = {
      totalArticles: articles?.length || 0,
      articlesProcessed: processedCount,
      totalBrokenLinks: results.reduce((sum, r) => sum + r.brokenLinksCount, 0),
      totalLanguageMismatches: results.reduce((sum, r) => sum + r.languageMismatchCount, 0),
      totalIrrelevantLinks: results.reduce((sum, r) => sum + r.irrelevantLinksCount, 0),
      articlesWithIssues: results.filter(
        r => r.brokenLinksCount > 0 || r.languageMismatchCount > 0 || r.irrelevantLinksCount > 0
      ).length,
    };

    console.log('Batch validation complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Batch validation error:', error);
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
