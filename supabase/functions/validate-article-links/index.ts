import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { analyzeLinksWithPerplexity } from "../shared/perplexityLinkAnalyzer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkValidationResult {
  url: string;
  isWorking: boolean;
  statusCode: number | null;
  language: string | null;
  contentSummary: string | null;
  isRelevant: boolean | null;
  relevanceScore: number | null;
  recommendations: string[];
  alternativeSources: string[];
  authorityLevel: string | null;
  contentQuality: string | null;
  error: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId } = await req.json();

    if (!articleId) {
      throw new Error('Article ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Validating links for article ${articleId}`);

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      throw new Error('Article not found');
    }

    // Extract links from content
    const externalLinks = extractExternalLinks(article.detailed_content);
    const internalLinks = extractInternalLinks(article.detailed_content);

    console.log(`Found ${externalLinks.length} external and ${internalLinks.length} internal links`);

    // First, check if external links are accessible
    const externalAccessibilityChecks = await Promise.all(
      externalLinks.map(url => checkLinkAccessibility(url))
    );

    // Filter working links for Perplexity analysis
    const workingExternalLinks = externalLinks.filter((_, index) => 
      externalAccessibilityChecks[index].isWorking
    );

    // Batch analyze all working external links with Perplexity
    let perplexityAnalysis = null;
    if (perplexityApiKey && workingExternalLinks.length > 0) {
      try {
        console.log(`Analyzing ${workingExternalLinks.length} working links with Perplexity...`);
        perplexityAnalysis = await analyzeLinksWithPerplexity(
          article.detailed_content,
          article.headline,
          article.language,
          workingExternalLinks,
          perplexityApiKey
        );
        console.log('Perplexity analysis complete');
      } catch (error) {
        console.error('Perplexity analysis failed:', error);
        // Continue without Perplexity analysis
      }
    }

    // Combine accessibility checks with Perplexity intelligence
    const externalValidations = externalAccessibilityChecks.map((check, index) => {
      const url = externalLinks[index];
      const analysis = perplexityAnalysis?.analyses[url];

      return {
        ...check,
        contentSummary: analysis?.contentSummary || null,
        isRelevant: analysis?.isRelevant ?? null,
        relevanceScore: analysis?.relevanceScore ?? null,
        recommendations: analysis?.recommendations || [],
        alternativeSources: analysis?.alternativeSources || [],
        authorityLevel: analysis?.authorityLevel || null,
        contentQuality: analysis?.contentQuality || null,
      };
    });

    // Validate internal links
    const internalValidations = await Promise.all(
      internalLinks.map(url => validateInternalLink(url, supabase))
    );

    // Count issues
    const brokenLinksCount = [...externalValidations, ...internalValidations]
      .filter(v => !v.isWorking).length;
    
    const languageMismatchCount = [...externalValidations, ...internalValidations]
      .filter(v => v.language && v.language !== article.language).length;
    
    const irrelevantLinksCount = externalValidations
      .filter(v => v.isRelevant === false).length;

    const validationResult = {
      articleId: article.id,
      articleSlug: article.slug,
      articleLanguage: article.language,
      articleTopic: article.headline,
      externalLinks: externalValidations,
      internalLinks: internalValidations,
      brokenLinksCount,
      languageMismatchCount,
      irrelevantLinksCount,
      validationDate: new Date().toISOString(),
    };

    // Save validation results
    const { error: saveError } = await supabase
      .from('link_validations')
      .insert({
        article_id: article.id,
        article_slug: article.slug,
        article_language: article.language,
        article_topic: article.headline,
        external_links: externalValidations,
        internal_links: internalValidations,
        broken_links_count: brokenLinksCount,
        language_mismatch_count: languageMismatchCount,
        irrelevant_links_count: irrelevantLinksCount,
        validation_status: 'completed',
      });

    if (saveError) {
      console.error('Error saving validation results:', saveError);
    }

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-article-links:', error);
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

function extractExternalLinks(content: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1];
    if (!url.startsWith('/') && !url.startsWith('#') && url.startsWith('http')) {
      links.push(url);
    }
  }

  return [...new Set(links)];
}

function extractInternalLinks(content: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1];
    if (url.startsWith('/') && !url.startsWith('//')) {
      links.push(url);
    }
  }

  return [...new Set(links)];
}

async function checkLinkAccessibility(url: string): Promise<LinkValidationResult> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkValidator/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    });

    const isWorking = response.ok || response.status === 403;
    const language = detectLanguageFromUrl(url);

    return {
      url,
      isWorking,
      statusCode: response.status,
      language,
      contentSummary: null,
      isRelevant: null,
      relevanceScore: null,
      recommendations: [],
      alternativeSources: [],
      authorityLevel: null,
      contentQuality: null,
      error: null,
    };
  } catch (error) {
    return {
      url,
      isWorking: false,
      statusCode: null,
      language: null,
      contentSummary: null,
      isRelevant: null,
      relevanceScore: null,
      recommendations: [],
      alternativeSources: [],
      authorityLevel: null,
      contentQuality: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function validateInternalLink(url: string, supabase: any): Promise<LinkValidationResult> {
  try {
    // Extract slug from URL (e.g., /blog/article-slug -> article-slug)
    const slug = url.replace(/^\/blog\//, '').replace(/\/$/, '');

    const { data, error } = await supabase
      .from('blog_articles')
      .select('id, status')
      .eq('slug', slug)
      .maybeSingle();

    const isWorking = !error && data && data.status === 'published';

    return {
      url,
      isWorking,
      statusCode: isWorking ? 200 : 404,
      language: null,
      contentSummary: null,
      isRelevant: true, // Internal links are assumed relevant
      relevanceScore: isWorking ? 100 : 0,
      recommendations: isWorking ? [] : ['Update or remove this broken internal link'],
      alternativeSources: [],
      authorityLevel: 'high',
      contentQuality: isWorking ? 'excellent' : 'poor',
      error: error?.message || (!data ? 'Article not found' : null),
    };
  } catch (error) {
    return {
      url,
      isWorking: false,
      statusCode: null,
      language: null,
      contentSummary: null,
      isRelevant: null,
      relevanceScore: null,
      recommendations: [],
      alternativeSources: [],
      authorityLevel: null,
      contentQuality: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function detectLanguageFromUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('.es') || lowerUrl.includes('.gob.es')) return 'es';
  if (lowerUrl.includes('.gov') || lowerUrl.includes('.gov.uk') || lowerUrl.includes('.edu')) return 'en';
  if (lowerUrl.includes('.de')) return 'de';
  if (lowerUrl.includes('.nl')) return 'nl';
  
  return null;
}
