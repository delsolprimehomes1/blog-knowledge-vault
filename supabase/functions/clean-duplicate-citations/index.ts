import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { dryRun = false, articleSlugs = [] } = await req.json();
    
    console.log('Starting duplicate citation cleanup...', { dryRun, specificArticles: articleSlugs.length });

    let query = supabaseClient
      .from('blog_articles')
      .select('id, slug, headline, detailed_content')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (articleSlugs.length > 0) {
      query = query.in('slug', articleSlugs);
    }

    const { data: articles, error: articlesError } = await query;

    if (articlesError) throw articlesError;

    console.log(`Found ${articles?.length || 0} published articles to check`);

    let processedCount = 0;
    let skippedCount = 0;
    let fixedDuplicatesCount = 0;
    const errors: any[] = [];
    const results: any[] = [];

    for (const article of articles || []) {
      try {
        const content = article.detailed_content;
        
        // Regex to find duplicate "According to" patterns
        // Matches: "According to Source (Year), According to Source (Year),"
        const duplicatePattern = /(According to [^(]+\([0-9]{4}\),\s*){2,}/g;
        const hasDuplicates = duplicatePattern.test(content);

        if (!hasDuplicates) {
          console.log(`⏭️  Skipping ${article.slug} - no duplicates found`);
          skippedCount++;
          results.push({
            slug: article.slug,
            status: 'skipped',
            reason: 'No duplicate citations found'
          });
          continue;
        }

        console.log(`Found duplicates in ${article.slug}, cleaning...`);

        // Remove duplicate "According to" phrases, keeping only the first occurrence
        let cleanedContent = content.replace(
          duplicatePattern,
          (match: string) => {
            // Extract just the first occurrence
            const firstOccurrence = match.match(/According to [^(]+\([0-9]{4}\),\s*/)?.[0];
            return firstOccurrence || match;
          }
        );

        const duplicatesRemoved = (content.match(duplicatePattern) || []).length;

        if (!dryRun) {
          // Create revision before updating
          await supabaseClient
            .from('article_revisions')
            .insert({
              article_id: article.id,
              previous_content: content,
              revision_type: 'duplicate_citation_cleanup',
              change_reason: 'Automated removal of duplicate inline citations',
              can_rollback: true
            });

          // Update article content
          await supabaseClient
            .from('blog_articles')
            .update({
              detailed_content: cleanedContent,
              date_modified: new Date().toISOString()
            })
            .eq('id', article.id);
        }

        processedCount++;
        fixedDuplicatesCount += duplicatesRemoved;
        
        console.log(`✓ ${dryRun ? '[DRY RUN] ' : ''}Cleaned ${article.slug}: ${duplicatesRemoved} duplicate citations removed`);
        
        results.push({
          slug: article.slug,
          headline: article.headline,
          status: 'success',
          duplicatesRemoved
        });

      } catch (articleError) {
        console.error(`Error processing ${article.slug}:`, articleError);
        errors.push({
          article: article.slug,
          error: (articleError as Error).message
        });
      }
    }

    const summary = {
      totalArticles: articles?.length || 0,
      processedArticles: processedCount,
      skippedArticles: skippedCount,
      totalDuplicatesRemoved: fixedDuplicatesCount,
      errors: errors.length,
      dryRun,
      errorDetails: errors,
      results: results
    };

    console.log('Cleanup complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        stack: (error as Error).stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
