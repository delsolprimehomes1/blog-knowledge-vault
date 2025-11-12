import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { automated } = await req.json().catch(() => ({}));

    console.log('Starting sitemap validation...');

    // 1. Fetch all published articles from database
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, date_modified, featured_image_url, funnel_stage')
      .eq('status', 'published');

    if (articlesError) throw articlesError;

    const totalPublished = articles?.length || 0;
    console.log(`Found ${totalPublished} published articles`);

    // 2. Fetch sitemap.xml from production
    const sitemapUrl = 'https://delsol-blog.lovableproject.com/sitemap.xml';
    let sitemapXml = '';
    let xmlIsValid = false;
    let xmlValidationErrors = [];

    try {
      const sitemapResponse = await fetch(sitemapUrl);
      sitemapXml = await sitemapResponse.text();
      xmlIsValid = sitemapResponse.ok && sitemapXml.includes('<?xml') && sitemapXml.includes('</urlset>');
      
      if (!xmlIsValid) {
        xmlValidationErrors.push('Invalid XML structure or missing required elements');
      }
    } catch (error) {
      xmlValidationErrors.push(`Failed to fetch sitemap: ${error.message}`);
    }

    // 3. Extract URLs from sitemap
    const urlMatches = sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g);
    const sitemapUrls = Array.from(urlMatches).map(match => match[1]);
    
    // Extract article slugs from sitemap URLs
    const articleUrlPattern = /\/blog\/([^\/]+)$/;
    const sitemapArticleSlugs = sitemapUrls
      .map(url => {
        const match = url.match(articleUrlPattern);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    const articlesInSitemap = sitemapArticleSlugs.length;
    console.log(`Found ${articlesInSitemap} articles in sitemap`);

    // 4. Find missing articles
    const articleSlugs = new Set(articles?.map(a => a.slug) || []);
    const sitemapSlugsSet = new Set(sitemapArticleSlugs);
    
    const missingArticleSlugs = Array.from(articleSlugs).filter(slug => !sitemapSlugsSet.has(slug));
    console.log(`Missing articles: ${missingArticleSlugs.length}`);

    // 5. Calculate quality metrics
    const lastmodMatches = Array.from(sitemapXml.matchAll(/<lastmod>(.*?)<\/lastmod>/g));
    const articlesWithLastmod = lastmodMatches.length;

    const imageMatches = Array.from(sitemapXml.matchAll(/<image:image>/g));
    const articlesWithImages = imageMatches.length;

    const priorityMatches = Array.from(sitemapXml.matchAll(/<priority>(.*?)<\/priority>/g));
    const articlesWithPriority = priorityMatches.length;

    const changefreqMatches = Array.from(sitemapXml.matchAll(/<changefreq>(.*?)<\/changefreq>/g));
    const articlesWithChangefreq = changefreqMatches.length;

    // 6. Image sitemap metrics
    const imageCaptionMatches = Array.from(sitemapXml.matchAll(/<image:caption>/g));
    const imagesWithCaption = imageCaptionMatches.length;

    const imageTitleMatches = Array.from(sitemapXml.matchAll(/<image:title>/g));
    const imagesWithTitle = imageTitleMatches.length;

    // 7. Calculate health score (0-100)
    const coverageScore = totalPublished > 0 ? (articlesInSitemap / totalPublished) * 40 : 0;
    const qualityScore = articlesInSitemap > 0 ? (articlesWithLastmod / articlesInSitemap) * 25 : 0;
    const imageScore = articlesInSitemap > 0 ? (articlesWithImages / articlesInSitemap) * 15 : 0;
    const technicalScore = xmlIsValid ? 10 : 0;
    const freshnessScore = articlesWithLastmod > 0 ? 10 : 0;

    const healthScore = Math.round(coverageScore + qualityScore + imageScore + technicalScore + freshnessScore);

    // 8. Generate recommendations
    const recommendations = [];
    
    if (articlesInSitemap < totalPublished) {
      recommendations.push({
        type: 'coverage',
        severity: 'critical',
        message: `${missingArticleSlugs.length} articles missing from sitemap`,
        action: 'Regenerate sitemap to include all published articles'
      });
    }

    if (articlesWithLastmod < articlesInSitemap * 0.95) {
      recommendations.push({
        type: 'quality',
        severity: 'warning',
        message: 'Some articles missing lastmod dates',
        action: 'Ensure all articles have date_modified in database'
      });
    }

    if (articlesWithImages < articlesInSitemap * 0.9) {
      recommendations.push({
        type: 'images',
        severity: 'warning',
        message: 'Some articles missing image sitemap entries',
        action: 'Add featured images to all articles'
      });
    }

    if (!xmlIsValid) {
      recommendations.push({
        type: 'technical',
        severity: 'critical',
        message: 'Sitemap XML validation failed',
        action: 'Check sitemap generator for XML formatting errors'
      });
    }

    // 9. Calculate coverage percentage
    const coveragePercentage = totalPublished > 0 
      ? Number(((articlesInSitemap / totalPublished) * 100).toFixed(2))
      : 0;

    // 10. Calculate file size
    const sitemapSizeKb = Math.round(new Blob([sitemapXml]).size / 1024);

    // 11. Store validation results
    const validationData = {
      total_published_articles: totalPublished,
      articles_in_sitemap: articlesInSitemap,
      coverage_percentage: coveragePercentage,
      missing_article_slugs: missingArticleSlugs,
      articles_with_lastmod: articlesWithLastmod,
      articles_with_images: articlesWithImages,
      articles_with_priority: articlesWithPriority,
      articles_with_changefreq: articlesWithChangefreq,
      xml_is_valid: xmlIsValid,
      xml_validation_errors: xmlValidationErrors,
      total_urls: sitemapUrls.length,
      sitemap_file_size_kb: sitemapSizeKb,
      broken_urls_count: 0,
      broken_urls: [],
      total_images: imageMatches.length,
      images_with_caption: imagesWithCaption,
      images_with_title: imagesWithTitle,
      health_score: healthScore,
      recommendations: recommendations,
      validation_duration_ms: Date.now() - startTime,
      validated_by: automated ? null : null
    };

    const { data: validation, error: validationError } = await supabase
      .from('sitemap_validations')
      .insert(validationData)
      .select()
      .single();

    if (validationError) throw validationError;

    // 12. Create alerts for critical issues
    const alerts = [];

    if (coveragePercentage < 95) {
      alerts.push({
        alert_type: 'low_coverage',
        severity: 'critical',
        message: `Only ${coveragePercentage}% of published articles in sitemap`,
        details: { missing_count: missingArticleSlugs.length, missing_slugs: missingArticleSlugs.slice(0, 10) }
      });
    }

    if (!xmlIsValid) {
      alerts.push({
        alert_type: 'xml_invalid',
        severity: 'critical',
        message: 'Sitemap XML validation failed',
        details: { errors: xmlValidationErrors }
      });
    }

    if (articlesWithLastmod < articlesInSitemap * 0.8) {
      alerts.push({
        alert_type: 'missing_lastmod',
        severity: 'warning',
        message: 'More than 20% of articles missing lastmod dates',
        details: { percentage: Math.round((1 - articlesWithLastmod / articlesInSitemap) * 100) }
      });
    }

    // Insert alerts
    if (alerts.length > 0) {
      await supabase.from('sitemap_alerts').insert(alerts);
    }

    console.log(`Validation completed in ${Date.now() - startTime}ms`);
    console.log(`Health Score: ${healthScore}/100`);
    console.log(`Coverage: ${coveragePercentage}%`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        validation,
        alerts: alerts.length,
        healthScore,
        coveragePercentage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
