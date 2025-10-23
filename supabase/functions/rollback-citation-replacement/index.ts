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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { revisionId } = await req.json();

    if (!revisionId) {
      throw new Error('revisionId is required');
    }

    console.log(`⏮️ Rolling back revision: ${revisionId}`);

    // Fetch revision
    const { data: revision, error: revError } = await supabase
      .from('article_revisions')
      .select('*')
      .eq('id', revisionId)
      .single();

    if (revError || !revision) {
      throw new Error('Revision not found');
    }

    // Check if rollback is allowed
    if (!revision.can_rollback) {
      throw new Error('This revision cannot be rolled back');
    }

    const now = new Date();
    const expiresAt = new Date(revision.rollback_expires_at);
    if (now > expiresAt) {
      throw new Error('Rollback period has expired (24 hours limit)');
    }

    console.log(`📄 Restoring article ${revision.article_id} to previous state`);

    // Restore article content
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        detailed_content: revision.previous_content,
        external_citations: revision.previous_citations,
        updated_at: new Date().toISOString()
      })
      .eq('id', revision.article_id);

    if (updateError) throw updateError;

    // Restore citation usage tracking
    if (revision.replacement_id) {
      const { data: replacement } = await supabase
        .from('dead_link_replacements')
        .select('original_url, replacement_url')
        .eq('id', revision.replacement_id)
        .single();

      if (replacement) {
        await supabase
          .from('citation_usage_tracking')
          .update({ 
            citation_url: replacement.original_url,
            updated_at: new Date().toISOString()
          })
          .eq('article_id', revision.article_id)
          .eq('citation_url', replacement.replacement_url);

        // Mark replacement as rolled back
        await supabase
          .from('dead_link_replacements')
          .update({ 
            status: 'rolled_back',
            updated_at: new Date().toISOString()
          })
          .eq('id', revision.replacement_id);
      }
    }

    // Mark revision as used (cannot rollback again)
    await supabase
      .from('article_revisions')
      .update({ can_rollback: false })
      .eq('id', revisionId);

    // Create a new revision documenting the rollback
    await supabase
      .from('article_revisions')
      .insert({
        article_id: revision.article_id,
        revision_type: 'rollback',
        previous_content: '', // We don't need to store this for rollback records
        change_reason: `Rolled back revision ${revisionId}`,
        can_rollback: false
      });

    console.log(`✅ Rollback complete for article ${revision.article_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        articleId: revision.article_id,
        message: 'Article successfully restored to previous state'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error rolling back citation replacement:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
