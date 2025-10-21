import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CitationHealthCheck {
  url: string;
  status: 'active' | 'dead' | 'redirected' | 'ssl_error' | 'timeout';
  httpStatusCode: number;
  responseTimeMs: number;
  redirectUrl?: string;
  contentHash?: string;
  pageTitle?: string;
}

async function checkUrlHealth(url: string): Promise<CitationHealthCheck> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CitationHealthBot/1.0)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    let pageTitle = '';
    let contentHash = '';
    
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
      const html = await response.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : '';
      
      const encoder = new TextEncoder();
      const data = encoder.encode(html.substring(0, 5000));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    let status: CitationHealthCheck['status'] = 'active';
    if (response.status >= 400 && response.status < 500) {
      status = 'dead';
    } else if (response.status >= 500) {
      status = 'timeout';
    } else if (response.redirected) {
      status = 'redirected';
    }
    
    return {
      url,
      status,
      httpStatusCode: response.status,
      responseTimeMs: responseTime,
      redirectUrl: response.redirected ? response.url : undefined,
      contentHash,
      pageTitle
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const err = error as Error;
    
    if (err.name === 'AbortError') {
      return {
        url,
        status: 'timeout',
        httpStatusCode: 0,
        responseTimeMs: responseTime
      };
    } else if (err.message?.includes('SSL') || err.message?.includes('certificate')) {
      return {
        url,
        status: 'ssl_error',
        httpStatusCode: 0,
        responseTimeMs: responseTime
      };
    } else {
      return {
        url,
        status: 'dead',
        httpStatusCode: 0,
        responseTimeMs: responseTime
      };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, external_citations, language')
      .eq('status', 'published');
    
    if (articlesError) throw articlesError;
    
    const urlSet = new Set<string>();
    const urlMetadata = new Map<string, { source: string; language: string }>();
    
    articles?.forEach(article => {
      const citations = article.external_citations as any[] || [];
      citations.forEach(citation => {
        if (citation.url) {
          urlSet.add(citation.url);
          if (!urlMetadata.has(citation.url)) {
            urlMetadata.set(citation.url, {
              source: citation.source || '',
              language: article.language || 'es'
            });
          }
        }
      });
    });
    
    console.log(`Found ${urlSet.size} unique citation URLs to verify`);
    
    const urls = Array.from(urlSet);
    const batchSize = 10;
    const healthChecks: CitationHealthCheck[] = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => checkUrlHealth(url))
      );
      healthChecks.push(...batchResults);
      
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    for (const check of healthChecks) {
      const metadata = urlMetadata.get(check.url);
      const isGov = check.url.includes('.gov') || check.url.includes('.gob.') || check.url.includes('.edu');
      
      const { data: existing } = await supabase
        .from('external_citation_health')
        .select('times_verified, times_failed')
        .eq('url', check.url)
        .single();
      
      const { error: upsertError } = await supabase
        .from('external_citation_health')
        .upsert({
          url: check.url,
          source_name: metadata?.source,
          language: metadata?.language,
          last_checked_at: new Date().toISOString(),
          status: check.status,
          http_status_code: check.httpStatusCode,
          response_time_ms: check.responseTimeMs,
          redirect_url: check.redirectUrl,
          content_hash: check.contentHash,
          page_title: check.pageTitle,
          is_government_source: isGov,
          times_verified: (existing?.times_verified || 0) + 1,
          times_failed: check.status === 'dead' ? (existing?.times_failed || 0) + 1 : existing?.times_failed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'url'
        });
      
      if (upsertError) {
        console.error(`Failed to update health for ${check.url}:`, upsertError);
      }
    }
    
    for (const article of articles || []) {
      const citations = article.external_citations as any[] || [];
      if (citations.length === 0) continue;
      
      const citationUrls = citations.map(c => c.url).filter(Boolean);
      const citationHealths = healthChecks.filter(h => citationUrls.includes(h.url));
      
      const activeCount = citationHealths.filter(h => h.status === 'active' || h.status === 'redirected').length;
      const healthScore = citationHealths.length > 0 ? (activeCount / citationHealths.length) : 1.0;
      const hasDead = citationHealths.some(h => h.status === 'dead' || h.status === 'timeout');
      
      await supabase
        .from('blog_articles')
        .update({
          citation_health_score: healthScore,
          last_citation_check_at: new Date().toISOString(),
          has_dead_citations: hasDead
        })
        .eq('id', article.id);
    }
    
    const summary = {
      totalChecked: healthChecks.length,
      active: healthChecks.filter(h => h.status === 'active').length,
      dead: healthChecks.filter(h => h.status === 'dead').length,
      redirected: healthChecks.filter(h => h.status === 'redirected').length,
      sslError: healthChecks.filter(h => h.status === 'ssl_error').length,
      timeout: healthChecks.filter(h => h.status === 'timeout').length
    };
    
    console.log('Verification complete:', summary);
    
    return new Response(
      JSON.stringify({
        success: true,
        summary,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in verify-citation-health:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
