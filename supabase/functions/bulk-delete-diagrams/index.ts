import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteResult {
  total_processed: number;
  success_count: number;
  error_count: number;
  errors: Array<{ article_id: string; error: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting bulk diagram deletion...');

    // Get all articles with diagram data
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline')
      .or('diagram_url.not.is.null,diagram_alt.not.is.null,diagram_caption.not.is.null,diagram_description.not.is.null');

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${articles?.length || 0} articles with diagram data`);

    const result: DeleteResult = {
      total_processed: articles?.length || 0,
      success_count: 0,
      error_count: 0,
      errors: []
    };

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete diagram data from all articles
    for (const article of articles) {
      try {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            diagram_url: null,
            diagram_alt: null,
            diagram_caption: null,
            diagram_description: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`Error updating article ${article.slug}:`, updateError);
          result.error_count++;
          result.errors.push({
            article_id: article.id,
            error: updateError.message
          });
        } else {
          console.log(`✅ Deleted diagram data from: ${article.headline}`);
          result.success_count++;
        }
      } catch (error) {
        console.error(`Exception updating article ${article.slug}:`, error);
        result.error_count++;
        result.errors.push({
          article_id: article.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Bulk deletion complete: ${result.success_count} succeeded, ${result.error_count} failed`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bulk-delete-diagrams function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        total_processed: 0,
        success_count: 0,
        error_count: 0,
        errors: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
