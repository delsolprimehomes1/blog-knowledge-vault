import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkReplacement {
  oldUrl: string;
  newUrl: string;
  newText?: string; // Optional new anchor text
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId, replacements } = await req.json();

    if (!articleId || !Array.isArray(replacements) || replacements.length === 0) {
      throw new Error('Article ID and replacements array are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Replacing ${replacements.length} links in article ${articleId}`);

    // Fetch article
    const { data: article, error: fetchError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error('Article not found');
    }

    let updatedContent = article.detailed_content;
    let replacedCount = 0;
    const replacementLog: any[] = [];

    // Apply each replacement
    for (const replacement of replacements) {
      const { oldUrl, newUrl, newText } = replacement;

      // Escape special regex characters in URL
      const escapedOldUrl = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Pattern to match the link with optional anchor text
      const linkPattern = new RegExp(
        `<a([^>]*)href=["']${escapedOldUrl}["']([^>]*)>([^<]*)</a>`,
        'gi'
      );

      const matches = [...updatedContent.matchAll(linkPattern)];
      
      if (matches.length > 0) {
        // Replace the link
        updatedContent = updatedContent.replace(linkPattern, (_match: string, before: string, after: string, text: string) => {
          const anchorText = newText || text;
          return `<a${before}href="${newUrl}"${after}>${anchorText}</a>`;
        });

        replacedCount += matches.length;
        replacementLog.push({
          oldUrl,
          newUrl,
          occurrences: matches.length,
          timestamp: new Date().toISOString(),
        });

        console.log(`Replaced ${matches.length} occurrence(s) of ${oldUrl} with ${newUrl}`);
      } else {
        console.warn(`URL not found in content: ${oldUrl}`);
      }
    }

    if (replacedCount === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No links were replaced. URLs may not exist in the article.',
          replacedCount: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update article
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        detailed_content: updatedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', articleId);

    if (updateError) {
      throw new Error(`Failed to update article: ${updateError.message}`);
    }

    console.log(`Successfully replaced ${replacedCount} links in article ${articleId}`);

    return new Response(
      JSON.stringify({
        success: true,
        articleId,
        replacedCount,
        replacementLog,
        message: `Successfully replaced ${replacedCount} link(s)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in replace-article-links:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        replacedCount: 0,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
