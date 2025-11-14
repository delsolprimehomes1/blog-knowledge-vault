import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { findCitationsWithCascade, verifyCitations } from "../shared/batchedCitationFinder.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      articleId,
      articleTopic,
      articleLanguage = 'en',
      articleContent,
      currentCitations = [],
      focusArea,
      verifyUrls = true,
      prioritizeGovernment = true,
      targetCount = 8,
      minimumGovPercentage = 70
    } = await req.json();

    if (!articleTopic || !articleContent) {
      throw new Error('Article topic and content are required');
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Initialize Supabase client for domain tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Finding better citations for: "${articleTopic}" (${articleLanguage})`);
    console.log(`Parameters: targetCount=${targetCount}, prioritizeGov=${prioritizeGovernment}, minGov=${minimumGovPercentage}%`);
    if (articleId) {
      console.log(`Domain rotation enabled for article: ${articleId.substring(0, 8)}...`);
    }

    // Find citations with cascading batch system + domain rotation + enhanced analysis
    const citations = await findCitationsWithCascade(
      articleTopic,
      articleLanguage,
      articleContent,
      targetCount,
      perplexityApiKey,
      focusArea,
      prioritizeGovernment,
      minimumGovPercentage,
      articleId,
      supabase,
      true // Enable enhanced sentence-level analysis
    );

    if (citations.length === 0) {
      console.error('⚠️ No citations found across any batch tiers');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No suitable citations found from approved domains. All batches returned no results.',
          citations: [],
          totalFound: 0,
          verifiedCount: 0
        }),
        { 
          status: 404,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Optionally verify URLs are accessible
    const finalCitations = verifyUrls 
      ? await verifyCitations(citations)
      : citations;

    const verifiedCount = finalCitations.filter((c: any) => c.verified !== false).length;

    console.log(`Returning ${finalCitations.length} citations (${verifiedCount} verified)`);

    return new Response(
      JSON.stringify({
        success: true,
        citations: finalCitations,
        totalFound: finalCitations.length,
        verifiedCount,
        language: articleLanguage,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in find-better-citations:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        citations: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
