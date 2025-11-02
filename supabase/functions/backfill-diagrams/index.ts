import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    console.log('🎨 Starting diagram backfill job...');

    // Fetch all published articles without diagrams
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, language, funnel_stage')
      .eq('status', 'published')
      .is('diagram_url', null)
      .order('funnel_stage', { ascending: false }); // BOFU first (highest priority)

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${articles.length} articles needing diagrams`);
    console.log(`   - BOFU: ${articles.filter(a => a.funnel_stage === 'BOFU').length}`);
    console.log(`   - MOFU: ${articles.filter(a => a.funnel_stage === 'MOFU').length}`);
    console.log(`   - TOFU: ${articles.filter(a => a.funnel_stage === 'TOFU').length}`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    const diagramTypeMap: Record<string, 'flowchart' | 'timeline' | 'comparison'> = {
      'TOFU': 'timeline',
      'MOFU': 'comparison',
      'BOFU': 'flowchart'
    };

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < articles.length; i += 5) {
      const batch = articles.slice(i, i + 5);
      console.log(`\n📦 Processing batch ${Math.floor(i / 5) + 1}/${Math.ceil(articles.length / 5)}`);

      for (const article of batch) {
        try {
          const diagramType = diagramTypeMap[article.funnel_stage] || 'timeline';
          
          console.log(`🎨 Generating ${diagramType} for: "${article.headline.substring(0, 50)}..."`);

          // Call generate-diagram-image edge function
          const { data: diagramData, error: diagramError } = await supabase.functions.invoke('generate-diagram-image', {
            body: {
              headline: article.headline,
              articleContent: article.detailed_content?.substring(0, 500) || '',
              diagramType: diagramType,
              language: article.language
            }
          });

          if (!diagramError && diagramData?.imageUrl) {
            // Update article with diagram
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({
                diagram_url: diagramData.imageUrl,
                diagram_alt: diagramData.altText || `${diagramType} diagram`,
                diagram_caption: diagramData.caption || 'Visual guide',
                diagram_description: diagramData.description || `${diagramType} infographic`
              })
              .eq('id', article.id);

            if (!updateError) {
              successCount++;
              console.log(`   ✅ Success (${successCount}/${articles.length})`);
            } else {
              errorCount++;
              errors.push({ article: article.slug, error: 'Update failed', details: updateError });
            }
          } else {
            errorCount++;
            errors.push({ article: article.slug, error: 'Generation failed', details: diagramError });
          }
        } catch (error) {
          errorCount++;
          errors.push({ article: article.slug, error: 'Exception', details: error });
          console.error(`   ❌ Error:`, error);
        }
      }

      // Wait 5 seconds between batches to respect rate limits
      if (i + 5 < articles.length) {
        console.log('⏳ Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n✅ Backfill job completed!');
    console.log(`   - Success: ${successCount}/${articles.length}`);
    console.log(`   - Errors: ${errorCount}/${articles.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_articles: articles.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.slice(0, 10), // First 10 errors only
        message: `Diagram backfill completed: ${successCount} succeeded, ${errorCount} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Backfill job failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
