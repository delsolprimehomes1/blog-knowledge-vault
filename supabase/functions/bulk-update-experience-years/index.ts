import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Starting bulk update for experience years...');

    // Fetch all articles containing "15 years"
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, detailed_content, language')
      .or('detailed_content.ilike.%15 years%,detailed_content.ilike.%15+ years%,detailed_content.ilike.%15-year%');

    if (fetchError) throw fetchError;
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No articles found with "15 years"', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${articles.length} articles to update`);

    const updateResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each article
    for (const article of articles) {
      try {
        // Perform all replacements (case-insensitive where needed)
        let updatedContent = article.detailed_content;
        
        // Track what was changed for logging
        const changesMade = [];
        
        // Replace "15 years" → "35 years"
        if (updatedContent.includes('15 years')) {
          updatedContent = updatedContent.replace(/15 years/gi, '35 years');
          changesMade.push('"15 years" → "35 years"');
        }
        
        // Replace "15+ years" → "35+ years"
        if (updatedContent.includes('15+')) {
          updatedContent = updatedContent.replace(/15\+/g, '35+');
          changesMade.push('"15+" → "35+"');
        }
        
        // Replace "15-year" → "35-year"
        if (updatedContent.includes('15-year')) {
          updatedContent = updatedContent.replace(/15-year/gi, '35-year');
          changesMade.push('"15-year" → "35-year"');
        }

        // Only update if content actually changed
        if (updatedContent === article.detailed_content) {
          console.log(`No changes needed for: ${article.headline}`);
          updateResults.push({
            slug: article.slug,
            headline: article.headline,
            status: 'skipped',
            reason: 'No matching text found'
          });
          continue;
        }

        // Update the article
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            detailed_content: updatedContent,
            date_modified: new Date().toISOString(),
          })
          .eq('id', article.id);

        if (updateError) throw updateError;

        // Log the content update
        await supabase.from('content_updates').insert({
          article_id: article.id,
          update_type: 'bulk_text_replacement',
          updated_fields: ['detailed_content'],
          update_notes: `Bulk update: Changed Hans Beeckman experience from 15 years to 35 years. Changes: ${changesMade.join(', ')}`,
          previous_date_modified: null,
          new_date_modified: new Date().toISOString(),
        });

        successCount++;
        updateResults.push({
          slug: article.slug,
          headline: article.headline,
          status: 'updated',
          changes: changesMade
        });

        console.log(`✅ Updated: ${article.headline}`);
      } catch (error: any) {
        errorCount++;
        updateResults.push({
          slug: article.slug,
          headline: article.headline,
          status: 'error',
          error: error.message
        });
        console.error(`❌ Failed to update ${article.headline}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_found: articles.length,
          successfully_updated: successCount,
          errors: errorCount,
          skipped: articles.length - successCount - errorCount
        },
        details: updateResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Bulk update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
