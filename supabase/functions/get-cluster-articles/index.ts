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
    const { cluster_id, current_article_id, language } = await req.json();

    if (!cluster_id) {
      return new Response(
        JSON.stringify({ links: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch other articles in the same cluster
    const { data: articles, error } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, cluster_id')
      .eq('cluster_id', cluster_id)
      .eq('language', language || 'en')
      .eq('status', 'published')
      .neq('id', current_article_id)
      .order('cluster_number', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error fetching cluster articles:', error);
      throw error;
    }

    // Transform to internal link format
    const clusterLinks = (articles || []).map(article => ({
      text: article.headline,
      url: `/blog/${article.slug}`,
      title: article.headline,
    }));

    console.log(`Found ${clusterLinks.length} cluster articles for cluster_id: ${cluster_id}`);

    return new Response(
      JSON.stringify({ links: clusterLinks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-cluster-articles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, links: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
