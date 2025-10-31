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
  year?: number;
}

interface ArticleData {
  id: string;
  slug: string;
  headline: string;
  external_citations: ExternalCitation[];
  date_published: string | null;
  date_modified: string | null;
}

// Extract year from URL patterns
function extractYearFromUrl(url: string): number | null {
  // Pattern 1: /2024/ or /2025/ in path
  const pathYearMatch = url.match(/\/(\d{4})\//);
  if (pathYearMatch) {
    const year = parseInt(pathYearMatch[1]);
    if (year >= 2020 && year <= new Date().getFullYear() + 1) {
      return year;
    }
  }
  
  // Pattern 2: -2024- or _2025_ in filename
  const filenameYearMatch = url.match(/[-_](\d{4})[-_]/);
  if (filenameYearMatch) {
    const year = parseInt(filenameYearMatch[1]);
    if (year >= 2020 && year <= new Date().getFullYear() + 1) {
      return year;
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { dryRun = false } = await req.json().catch(() => ({ dryRun: false }));

    console.log(`Starting citation year backfill (dry run: ${dryRun})...`);

    // Fetch all published articles with citations
    const { data: articles, error: fetchError } = await supabaseClient
      .from('blog_articles')
      .select('id, slug, headline, external_citations, date_published, date_modified')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No articles found with citations',
          articlesProcessed: 0,
          citationsUpdated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${articles.length} articles with citations`);

    let articlesUpdated = 0;
    let citationsUpdated = 0;
    let errors: string[] = [];
    const updates: Array<{ slug: string; citationsFixed: number; method: string }> = [];

    // Process articles in batches
    const batchSize = 10;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      for (const article of batch as ArticleData[]) {
        try {
          let citations = article.external_citations || [];
          let citationsModified = 0;
          let methods: string[] = [];

          // Check if citations need updating
          const needsUpdate = citations.some(c => !c.year || c.year === null);
          
          if (!needsUpdate) {
            console.log(`✓ Article "${article.slug}" - all citations already have years`);
            continue;
          }

          // Update citations without year
          citations = citations.map(citation => {
            if (citation.year && citation.year !== null) {
              return citation; // Already has year
            }

            citationsModified++;
            let year: number;
            let method: string;

            // Strategy 1: Extract from URL
            const urlYear = extractYearFromUrl(citation.url);
            if (urlYear) {
              year = urlYear;
              method = 'url';
            }
            // Strategy 2: Use article's publication date
            else if (article.date_published) {
              year = new Date(article.date_published).getFullYear();
              method = 'publication_date';
            }
            // Strategy 3: Use article's modification date
            else if (article.date_modified) {
              year = new Date(article.date_modified).getFullYear();
              method = 'modification_date';
            }
            // Strategy 4: Default to 2024 for older content (conservative)
            else {
              year = 2024;
              method = 'default';
            }

            methods.push(method);
            return { ...citation, year };
          });

          if (citationsModified > 0) {
            console.log(`  → Article "${article.slug}": updating ${citationsModified} citations (methods: ${[...new Set(methods)].join(', ')})`);
            
            if (!dryRun) {
              const { error: updateError } = await supabaseClient
                .from('blog_articles')
                .update({ external_citations: citations as any })
                .eq('id', article.id);

              if (updateError) {
                errors.push(`${article.slug}: ${updateError.message}`);
                continue;
              }
            }

            articlesUpdated++;
            citationsUpdated += citationsModified;
            updates.push({
              slug: article.slug,
              citationsFixed: citationsModified,
              method: [...new Set(methods)].join(', ')
            });
          }
        } catch (articleError: any) {
          console.error(`Error processing article ${article.slug}:`, articleError);
          errors.push(`${article.slug}: ${articleError.message}`);
        }
      }
    }

    const response = {
      success: true,
      dryRun,
      totalArticles: articles.length,
      articlesUpdated,
      citationsUpdated,
      errors: errors.length > 0 ? errors : undefined,
      sampleUpdates: updates.slice(0, 10), // Show first 10 updates
      message: dryRun 
        ? `Dry run complete: Would update ${citationsUpdated} citations across ${articlesUpdated} articles`
        : `✅ Successfully updated ${citationsUpdated} citations across ${articlesUpdated} articles`,
    };

    console.log(response.message);
    if (errors.length > 0) {
      console.error(`Errors: ${errors.length}`);
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Backfill error:', error);
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
