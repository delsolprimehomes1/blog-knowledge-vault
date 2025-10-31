import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalCitation {
  text: string;
  url: string;
  source: string;
  sourceType?: string;
  authorityScore?: number;
  year?: number;
}

interface ArticleData {
  id: string;
  slug: string;
  headline: string;
  language: string;
  detailed_content: string;
  external_citations: ExternalCitation[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { dryRun = false, targetCitationCount = 6 } = await req.json().catch(() => ({}));

    console.log(`🚀 Starting bulk citation enhancement (target: ${targetCitationCount}, dry run: ${dryRun})`);

    // Fetch articles with < 5 citations
    const { data: articles, error: fetchError } = await supabaseClient
      .from('blog_articles')
      .select('id, slug, headline, language, detailed_content, external_citations')
      .eq('status', 'published');

    if (fetchError) throw fetchError;

    // Filter articles that need more citations
    const articlesToEnhance = (articles as ArticleData[]).filter(
      article => (article.external_citations || []).length < 5
    );

    console.log(`📊 Found ${articlesToEnhance.length} articles needing citation enhancement`);

    if (articlesToEnhance.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '✅ All articles have sufficient citations (5+)',
          articlesProcessed: 0,
          citationsAdded: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let articlesUpdated = 0;
    let totalCitationsAdded = 0;
    const results: Array<{ slug: string; before: number; after: number; added: number }> = [];
    const errors: string[] = [];

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < articlesToEnhance.length; i += batchSize) {
      const batch = articlesToEnhance.slice(i, i + batchSize);
      
      for (const article of batch) {
        try {
          const currentCitationCount = (article.external_citations || []).length;
          const citationsNeeded = Math.min(
            targetCitationCount - currentCitationCount,
            3 // Max 3 new citations per article per run
          );

          if (citationsNeeded <= 0) continue;

          console.log(`\n📄 Processing: ${article.slug}`);
          console.log(`   Current: ${currentCitationCount} citations`);
          console.log(`   Need: ${citationsNeeded} more citations`);

          // Call find-better-citations to get new citations
          const { data: citationResponse, error: citationError } = await supabaseClient.functions.invoke(
            'find-better-citations',
            {
              body: {
                articleTopic: article.headline,
                articleLanguage: article.language || 'en',
                articleContent: article.detailed_content.substring(0, 2000), // First 2000 chars for context
                currentCitations: article.external_citations || [],
                verifyUrls: true,
              }
            }
          );

          if (citationError) {
            console.error(`   ❌ Citation finder error: ${citationError.message}`);
            errors.push(`${article.slug}: ${citationError.message}`);
            continue;
          }

          if (!citationResponse?.success || !citationResponse.citations || citationResponse.citations.length === 0) {
            console.log(`   ⚠️ No new citations found`);
            errors.push(`${article.slug}: No suitable citations found`);
            continue;
          }

          // Filter out duplicates and take only needed amount
          const existingUrls = new Set((article.external_citations || []).map(c => c.url));
          const newCitations = citationResponse.citations
            .filter((c: any) => !existingUrls.has(c.url))
            .slice(0, citationsNeeded)
            .map((c: any) => ({
              text: c.description || c.source,
              url: c.url,
              source: c.source,
              sourceType: c.sourceType || 'organization',
              authorityScore: c.authorityScore || 85,
              year: c.year || new Date().getFullYear(),
            }));

          if (newCitations.length === 0) {
            console.log(`   ⚠️ All found citations were duplicates`);
            continue;
          }

          const updatedCitations = [...(article.external_citations || []), ...newCitations];

          console.log(`   ✅ Adding ${newCitations.length} new citations`);
          newCitations.forEach((c: ExternalCitation, idx: number) => {
            console.log(`      ${idx + 1}. ${c.source} (${c.year}) - Score: ${c.authorityScore}`);
          });

          if (!dryRun) {
            const { error: updateError } = await supabaseClient
              .from('blog_articles')
              .update({ 
                external_citations: updatedCitations as any,
                date_modified: new Date().toISOString(),
              })
              .eq('id', article.id);

            if (updateError) {
              errors.push(`${article.slug}: ${updateError.message}`);
              continue;
            }
          }

          articlesUpdated++;
          totalCitationsAdded += newCitations.length;
          results.push({
            slug: article.slug,
            before: currentCitationCount,
            after: currentCitationCount + newCitations.length,
            added: newCitations.length,
          });

        } catch (articleError: any) {
          console.error(`   ❌ Error: ${articleError.message}`);
          errors.push(`${article.slug}: ${articleError.message}`);
        }
      }

      // Rate limiting: wait 2s between batches
      if (i + batchSize < articlesToEnhance.length) {
        console.log(`\n⏳ Waiting 2s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const response = {
      success: true,
      dryRun,
      totalArticlesChecked: articlesToEnhance.length,
      articlesUpdated,
      totalCitationsAdded,
      averageCitationsAdded: articlesUpdated > 0 ? (totalCitationsAdded / articlesUpdated).toFixed(1) : 0,
      errors: errors.length > 0 ? errors : undefined,
      sampleResults: results.slice(0, 10),
      message: dryRun
        ? `Dry run: Would add ${totalCitationsAdded} citations to ${articlesUpdated} articles`
        : `✅ Added ${totalCitationsAdded} citations to ${articlesUpdated} articles`,
    };

    console.log(`\n${response.message}`);
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} errors occurred`);
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Bulk enhancement error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
