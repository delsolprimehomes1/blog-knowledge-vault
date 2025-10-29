import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isApprovedDomain } from "../shared/approvedDomains.ts";
import { isCompetitor } from "../shared/competitorBlacklist.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CitationValidationRequest {
  citations: Array<{
    url: string;
    source: string;
    text: string;
  }>;
  articleId?: string;
  checkAccessibility?: boolean;
}

interface CitationValidationResult {
  url: string;
  isCompliant: boolean;
  isApproved: boolean;
  isCompetitor: boolean;
  isAccessible: boolean | null;
  statusCode: number | null;
  severity: 'valid' | 'warning' | 'critical';
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { citations, checkAccessibility = true }: CitationValidationRequest = await req.json();

    if (!citations || citations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No citations provided for validation' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Validating ${citations.length} citations...`);

    const results: CitationValidationResult[] = [];

    for (const citation of citations) {
      const result: CitationValidationResult = {
        url: citation.url,
        isCompliant: false,
        isApproved: false,
        isCompetitor: false,
        isAccessible: null,
        statusCode: null,
        severity: 'valid',
        message: '',
      };

      // Check if competitor (CRITICAL)
      if (isCompetitor(citation.url)) {
        result.isCompetitor = true;
        result.severity = 'critical';
        result.message = '🚫 BLOCKED: Competitor domain (real estate agency/broker)';
        results.push(result);
        continue;
      }

      // Check if approved domain
      if (!isApprovedDomain(citation.url)) {
        result.severity = 'warning';
        result.message = '⚠️ Not in approved domains list';
        results.push(result);
        continue;
      }

      result.isApproved = true;

      // Check accessibility if requested
      if (checkAccessibility) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const response = await fetch(citation.url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
          });
          
          clearTimeout(timeoutId);
          
          result.statusCode = response.status;
          result.isAccessible = response.ok;
          
          if (!response.ok) {
            result.severity = 'warning';
            result.message = `⚠️ HTTP ${response.status} - Link may be broken`;
          } else {
            result.isCompliant = true;
            result.severity = 'valid';
            result.message = '✅ Valid and accessible';
          }
        } catch (error) {
          console.error(`Failed to check ${citation.url}:`, error);
          result.isAccessible = false;
          result.severity = 'warning';
          result.message = '⚠️ Unable to verify accessibility';
        }
      } else {
        // If not checking accessibility, mark as compliant if approved
        result.isCompliant = true;
        result.severity = 'valid';
        result.message = '✅ Approved domain';
      }

      results.push(result);
    }

    const summary = {
      totalCitations: citations.length,
      compliantCitations: results.filter(r => r.isCompliant).length,
      competitorCitations: results.filter(r => r.isCompetitor).length,
      nonApprovedCitations: results.filter(r => !r.isApproved && !r.isCompetitor).length,
      criticalIssues: results.filter(r => r.severity === 'critical').length,
      warnings: results.filter(r => r.severity === 'warning').length,
      complianceScore: Math.round((results.filter(r => r.isCompliant).length / citations.length) * 100),
    };

    console.log(`✅ Validation complete: ${summary.compliantCitations}/${summary.totalCitations} compliant (${summary.complianceScore}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in validate-citation-compliance:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
