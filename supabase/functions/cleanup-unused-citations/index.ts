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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧹 Starting cleanup of unused citations...');

    // Step 1: Find all citation URLs in external_citation_health
    const { data: healthRecords, error: healthError } = await supabaseClient
      .from('external_citation_health')
      .select('url, id');

    if (healthError) {
      console.error('Error fetching health records:', healthError);
      throw healthError;
    }

    console.log(`📊 Found ${healthRecords?.length || 0} health records to check`);

    // Step 2: Check each URL to see if it's actively used in citation_usage_tracking
    const orphanedUrls: string[] = [];
    const orphanedIds: string[] = [];

    for (const record of healthRecords || []) {
      const { data: usageRecords, error: usageError } = await supabaseClient
        .from('citation_usage_tracking')
        .select('id')
        .eq('citation_url', record.url)
        .eq('is_active', true);

      if (usageError) {
        console.error(`Error checking usage for ${record.url}:`, usageError);
        continue;
      }

      // If no active usage records found, mark as orphaned
      if (!usageRecords || usageRecords.length === 0) {
        orphanedUrls.push(record.url);
        orphanedIds.push(record.id);
        console.log(`🗑️ Orphaned: ${record.url}`);
      }
    }

    console.log(`\n📋 Found ${orphanedUrls.length} orphaned citations to clean up`);

    let deletedHealthRecords = 0;
    let deletedReplacements = 0;

    if (orphanedUrls.length > 0) {
      // Step 3: Delete orphaned health records
      const { error: deleteHealthError } = await supabaseClient
        .from('external_citation_health')
        .delete()
        .in('id', orphanedIds);

      if (deleteHealthError) {
        console.error('Error deleting health records:', deleteHealthError);
        throw deleteHealthError;
      }
      deletedHealthRecords = orphanedIds.length;
      console.log(`✅ Deleted ${deletedHealthRecords} health records`);

      // Step 4: Delete associated replacement suggestions
      const { data: deletedData, error: deleteReplacementsError } = await supabaseClient
        .from('dead_link_replacements')
        .delete()
        .in('original_url', orphanedUrls)
        .select();

      if (deleteReplacementsError) {
        console.error('Error deleting replacement suggestions:', deleteReplacementsError);
        // Don't throw, just log - replacements are less critical
      } else {
        deletedReplacements = deletedData?.length || 0;
        console.log(`✅ Deleted ${deletedReplacements} replacement suggestions`);
      }
    }

    const summary = {
      success: true,
      orphaned_citations_removed: deletedHealthRecords,
      replacement_suggestions_removed: deletedReplacements,
      remaining_health_records: (healthRecords?.length || 0) - deletedHealthRecords,
      message: deletedHealthRecords === 0 
        ? '✨ All citations are actively used - nothing to clean up!'
        : `🧹 Cleaned up ${deletedHealthRecords} unused citations and ${deletedReplacements} orphaned replacements`
    };

    console.log('\n✅ Cleanup complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Error in cleanup-unused-citations:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
