import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const CONFIG = {
  AUTO_REPLACE_THRESHOLD: 0.85,      // Only auto-replace if confidence >= 85%
  MAX_AUTO_REPLACEMENTS: 50,         // Safety limit per scan
  ENABLE_AUTO_REPLACE: false,        // Set to true to enable automatic replacement
  ALERT_THRESHOLD: 10,               // Alert if violations > this number
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🕐 Starting scheduled citation hygiene scan...');

    // Step 1: Run the scan
    const scanResponse = await supabase.functions.invoke('scan-banned-citations');
    
    if (!scanResponse.data || scanResponse.error) {
      throw new Error(`Scan failed: ${scanResponse.error?.message || 'Unknown error'}`);
    }

    const scanResult = scanResponse.data;
    console.log('✅ Scan completed:', scanResult);

    // Step 2: Calculate compliance metrics
    const totalArticles = scanResult.totalArticles || 0;
    const articlesWithViolations = scanResult.affectedArticles || 0;
    const complianceScore = totalArticles > 0 
      ? ((totalArticles - articlesWithViolations) / totalArticles) * 100 
      : 100;

    // Step 3: Optionally trigger batch replacement for high-confidence cases
    let replacementResult = null;
    let cleanReplacementsApplied = 0;
    let articlesCleaned = 0;
    let autoReplacementTriggered = false;

    if (CONFIG.ENABLE_AUTO_REPLACE && scanResult.bannedCitationsFound > 0) {
      console.log('🔄 Auto-replacement enabled, checking for high-confidence replacements...');
      
      // Get all unresolved banned domain alerts
      const { data: alerts } = await supabase
        .from('citation_compliance_alerts')
        .select('article_id')
        .eq('alert_type', 'banned_domain')
        .is('resolved_at', null)
        .limit(CONFIG.MAX_AUTO_REPLACEMENTS);

      if (alerts && alerts.length > 0) {
        const articleIds = [...new Set(alerts.map(a => a.article_id))];
        
        console.log(`📋 Triggering batch replacement for ${articleIds.length} articles...`);
        
        const replaceResponse = await supabase.functions.invoke('batch-replace-banned-citations', {
          body: { articleIds }
        });

        if (replaceResponse.data && !replaceResponse.error) {
          replacementResult = replaceResponse.data;
          cleanReplacementsApplied = replacementResult.summary?.autoApplied || 0;
          articlesCleaned = replacementResult.summary?.articlesUpdated || 0;
          autoReplacementTriggered = true;
          console.log(`✅ Batch replacement completed: ${cleanReplacementsApplied} citations replaced`);
        }
      }
    }

    // Step 4: Generate and save report
    const nextScanScheduled = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
    const scanDuration = Date.now() - startTime;

    const report = {
      scan_date: new Date().toISOString(),
      total_articles_scanned: totalArticles,
      total_citations_scanned: scanResult.totalCitationsScanned || 0,
      banned_citations_found: scanResult.bannedCitationsFound || 0,
      articles_with_violations: articlesWithViolations,
      clean_replacements_applied: cleanReplacementsApplied,
      articles_cleaned: articlesCleaned,
      violations_by_domain: scanResult.violationsByDomain || {},
      violations_by_language: scanResult.violationsByLanguage || {},
      top_offenders: scanResult.topOffenders || [],
      compliance_score: Math.round(complianceScore * 100) / 100,
      next_scan_scheduled: nextScanScheduled.toISOString(),
      scan_duration_ms: scanDuration,
      auto_replacement_triggered: autoReplacementTriggered,
    };

    // Save report to database
    const { error: insertError } = await supabase
      .from('citation_hygiene_reports')
      .insert(report);

    if (insertError) {
      console.error('Error saving report:', insertError);
    } else {
      console.log('✅ Report saved to database');
    }

    // Step 5: Check if alert threshold exceeded
    const shouldAlert = scanResult.bannedCitationsFound > CONFIG.ALERT_THRESHOLD;
    
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      scan: {
        articlesScanned: totalArticles,
        citationsScanned: scanResult.totalCitationsScanned,
        violationsFound: scanResult.bannedCitationsFound,
        articlesAffected: articlesWithViolations,
        complianceScore: Math.round(complianceScore * 100) / 100,
      },
      actions: {
        autoReplacementEnabled: CONFIG.ENABLE_AUTO_REPLACE,
        autoReplacementTriggered,
        replacementsApplied: cleanReplacementsApplied,
        articlesCleaned,
      },
      alert: {
        shouldAlert,
        threshold: CONFIG.ALERT_THRESHOLD,
        message: shouldAlert 
          ? `⚠️ ALERT: ${scanResult.bannedCitationsFound} banned citations detected (threshold: ${CONFIG.ALERT_THRESHOLD})`
          : '✅ Citation hygiene within acceptable limits',
      },
      nextScan: nextScanScheduled.toISOString(),
      scanDurationMs: scanDuration,
    };

    console.log('✅ Scheduled hygiene scan complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scheduled-citation-hygiene:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
