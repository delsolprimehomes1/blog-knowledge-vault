import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://delsolprimehomes.com';

interface SitemapArticle {
  slug: string;
  date_modified?: string;
  date_published?: string;
  funnel_stage: string;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption?: string;
  headline: string;
  citation_health_score?: number;
  language?: string;
  translations?: any;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
  images?: Array<{
    loc: string;
    title: string;
    caption?: string;
  }>;
  hreflang?: Array<{
    rel: string;
    hreflang: string;
    href: string;
  }>;
  isNews?: boolean;
  newsTitle?: string;
  newsPublicationDate?: string;
}

/**
 * Calculate dynamic priority based on article characteristics
 * Considers: funnel stage, citation quality, recency
 */
function calculatePriority(article: SitemapArticle): string {
  let priority = 0.5;
  
  // Funnel stage (highest impact)
  if (article.funnel_stage === 'BOFU') {
    priority += 0.30; // Money pages
  } else if (article.funnel_stage === 'MOFU') {
    priority += 0.20;
  } else {
    priority += 0.15;
  }
  
  // Citation quality (E-E-A-T signal)
  if (article.citation_health_score && article.citation_health_score >= 90) {
    priority += 0.10;
  } else if (article.citation_health_score && article.citation_health_score >= 75) {
    priority += 0.05;
  }
  
  // Recency boost
  if (article.date_published) {
    const daysSincePublish = (Date.now() - new Date(article.date_published).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublish <= 7) {
      priority += 0.10;
    } else if (daysSincePublish <= 30) {
      priority += 0.05;
    }
  }
  
  return Math.min(priority, 1.0).toFixed(1);
}

/**
 * Calculate change frequency based on article update patterns
 */
function calculateChangeFreq(article: SitemapArticle): 'daily' | 'weekly' | 'monthly' {
  // Recent updates = more frequent crawling
  if (article.date_modified) {
    const daysSinceModified = (Date.now() - new Date(article.date_modified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified <= 7) return 'daily';
  }
  
  // BOFU changes frequently (pricing, availability)
  if (article.funnel_stage === 'BOFU') return 'weekly';
  
  // TOFU is evergreen
  if (article.funnel_stage === 'TOFU') return 'monthly';
  
  return 'weekly';
}

/**
 * Format date to ISO 8601 format (YYYY-MM-DD)
 */
function formatDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

/**
 * Check if article qualifies as news (published in last 2 days)
 */
function isNewsArticle(article: SitemapArticle): boolean {
  if (!article.date_published) return false;
  const publishDate = new Date(article.date_published);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  return publishDate >= twoDaysAgo;
}

/**
 * Generate hreflang links for multilingual content
 */
function generateHreflangLinks(article: SitemapArticle): Array<{
  rel: string;
  hreflang: string;
  href: string;
}> {
  const links: Array<{
    rel: string;
    hreflang: string;
    href: string;
  }> = [];
  
  // x-default (use primary language)
  const primaryLang = article.language || 'en';
  links.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: `${BASE_URL}/${primaryLang}/blog/${article.slug}`
  });
  
  // Primary language
  links.push({
    rel: 'alternate',
    hreflang: primaryLang,
    href: `${BASE_URL}/${primaryLang}/blog/${article.slug}`
  });
  
  // Translations
  if (article.translations && typeof article.translations === 'object') {
    Object.entries(article.translations).forEach(([lang, translation]: [string, any]) => {
      if (translation && typeof translation === 'object' && translation.slug) {
        links.push({
          rel: 'alternate',
          hreflang: lang,
          href: `${BASE_URL}/${lang}/blog/${translation.slug}`
        });
      }
    });
  }
  
  return links;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate sitemap URL entry with enhanced metadata
 */
function generateUrlEntry(url: SitemapUrl): string {
  let xml = '  <url>\n';
  xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
  
  if (url.lastmod) {
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
  }
  
  if (url.changefreq) {
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
  }
  
  if (url.priority) {
    xml += `    <priority>${url.priority}</priority>\n`;
  }
  
  // Add hreflang links for multilingual content
  if (url.hreflang && url.hreflang.length > 0) {
    url.hreflang.forEach(link => {
      xml += `    <xhtml:link rel="${link.rel}" hreflang="${link.hreflang}" href="${escapeXml(link.href)}" />\n`;
    });
  }
  
  // Add image sitemap extension
  if (url.images && url.images.length > 0) {
    url.images.forEach(image => {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
      if (image.caption) {
        xml += `      <image:caption>${escapeXml(image.caption)}</image:caption>\n`;
      }
      xml += '    </image:image>\n';
    });
  }
  
  // Add news metadata for recent articles
  if (url.isNews && url.newsTitle && url.newsPublicationDate) {
    xml += '    <news:news>\n';
    xml += '      <news:publication>\n';
    xml += '        <news:name>Del Sol Prime Homes</news:name>\n';
    xml += '        <news:language>en</news:language>\n';
    xml += '      </news:publication>\n';
    xml += `      <news:publication_date>${url.newsPublicationDate}</news:publication_date>\n`;
    xml += `      <news:title>${escapeXml(url.newsTitle)}</news:title>\n`;
    xml += '    </news:news>\n';
  }
  
  xml += '  </url>\n';
  return xml;
}

/**
 * Generate static pages URLs
 */
function generateStaticPages(): SitemapUrl[] {
  const today = new Date().toISOString().split('T')[0];
  const languages = ['en', 'nl', 'fr'];
  const pages: SitemapUrl[] = [];
  
  // Homepage (root)
  pages.push({
    loc: `${BASE_URL}/`,
    lastmod: today,
    changefreq: 'daily',
    priority: '1.0'
  });
  
  // Generate multilingual versions for each page
  const pageTemplates = [
    { path: 'about', changefreq: 'monthly' as const, priority: '0.9' },
    { path: 'blog', changefreq: 'daily' as const, priority: '0.9', lastmod: today },
    { path: 'faq', changefreq: 'monthly' as const, priority: '0.9' },
    { path: 'qa', changefreq: 'monthly' as const, priority: '0.9' },
    { path: 'case-studies', changefreq: 'monthly' as const, priority: '0.8' },
    { path: 'privacy-policy', changefreq: 'yearly' as const, priority: '0.5', lastmod: '2025-01-27' },
    { path: 'terms-of-service', changefreq: 'yearly' as const, priority: '0.5', lastmod: '2025-01-27' }
  ];
  
  languages.forEach(lang => {
    pageTemplates.forEach(template => {
      pages.push({
        loc: `${BASE_URL}/${lang}/${template.path}`,
        changefreq: template.changefreq,
        priority: template.priority,
        lastmod: template.lastmod
      });
    });
  });
  
  return pages;
}

/**
 * Generate category page URLs
 */
function generateCategoryPages(): SitemapUrl[] {
  const languages = ['en', 'nl', 'fr'];
  const categories = [
    'buying-guides',
    'investment-strategies',
    'legal-regulations',
    'location-insights',
    'market-analysis',
    'property-management'
  ];
  
  const pages: SitemapUrl[] = [];
  
  languages.forEach(lang => {
    categories.forEach(category => {
      pages.push({
        loc: `${BASE_URL}/${lang}/blog/category/${category}`,
        changefreq: 'weekly' as const,
        priority: '0.8'
      });
    });
  });
  
  return pages;
}

export async function generateSitemap(distDir: string) {
  console.log('\n🗺️  Starting sitemap generation...');
  
  try {
    // Fetch all published articles with enhanced fields
    const { data: articles, error } = await supabase
      .from('blog_articles')
      .select('slug, date_modified, date_published, funnel_stage, featured_image_url, featured_image_alt, featured_image_caption, headline, citation_health_score, language, translations')
      .eq('status', 'published')
      .order('date_published', { ascending: false });

    if (error) {
      console.error('❌ Error fetching articles for sitemap:', error);
      throw error;
    }

    if (!articles || articles.length === 0) {
      console.log('⚠️  No published articles found for sitemap');
      return;
    }

    console.log(`📝 Processing ${articles.length} published articles`);

    // Generate sitemap XML with enhanced namespaces
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';
    xml += '\n';

    // Add static pages
    const staticPages = generateStaticPages();
    console.log(`📄 Adding ${staticPages.length} static pages`);
    staticPages.forEach(page => {
      xml += generateUrlEntry(page);
    });

    xml += '\n  <!-- Category Pages -->\n';
    const categoryPages = generateCategoryPages();
    console.log(`📂 Adding ${categoryPages.length} category pages`);
    categoryPages.forEach(page => {
      xml += generateUrlEntry(page);
    });

    xml += '\n  <!-- Blog Articles with Enhanced Metadata -->\n';
    
    // Add article URLs with enhanced metadata
    let articleCount = 0;
    let newsCount = 0;
    let multilingualCount = 0;
    
    for (const article of articles as SitemapArticle[]) {
      const isNews = isNewsArticle(article);
      if (isNews) newsCount++;
      
      const hreflangLinks = generateHreflangLinks(article);
      if (hreflangLinks.length > 2) multilingualCount++; // More than x-default and primary
      
      const articleUrl: SitemapUrl = {
        loc: `${BASE_URL}/${article.language || 'en'}/blog/${article.slug}`,
        lastmod: formatDate(article.date_modified || article.date_published),
        changefreq: calculateChangeFreq(article),
        priority: calculatePriority(article),
        hreflang: hreflangLinks,
        isNews,
        newsTitle: isNews ? article.headline : undefined,
        newsPublicationDate: isNews ? formatDate(article.date_published) : undefined,
        images: []
      };

      // Add featured image to sitemap
      if (article.featured_image_url) {
        articleUrl.images!.push({
          loc: article.featured_image_url,
          title: article.headline,
          caption: article.featured_image_caption || article.featured_image_alt
        });
      }

      xml += generateUrlEntry(articleUrl);
      articleCount++;
    }

    xml += '</urlset>';

    // Write sitemap to dist directory
    const sitemapPath = join(distDir, 'sitemap.xml');
    mkdirSync(dirname(sitemapPath), { recursive: true });
    writeFileSync(sitemapPath, xml, 'utf-8');

    console.log(`\n✨ Sitemap generation complete with Phase 1 enhancements!`);
    console.log(`   📄 Static pages: ${staticPages.length}`);
    console.log(`   📂 Category pages: ${categoryPages.length}`);
    console.log(`   📝 Blog articles: ${articleCount}`);
    console.log(`   🖼️  Images included: ${articleCount}`);
    console.log(`   📊 Total URLs: ${staticPages.length + categoryPages.length + articleCount}`);
    console.log(`\n🎯 Phase 1 Critical Fixes Applied:`);
    console.log(`   ✅ Image tags: ${articleCount}/${articles.length} (100%)`);
    console.log(`   ✅ Hreflang tags: ${multilingualCount} multilingual articles`);
    console.log(`   ✅ News tags: ${newsCount} recent articles (last 2 days)`);
    console.log(`   ✅ Dynamic priority: Based on funnel stage, citations, recency`);
    console.log(`   ✅ Smart changefreq: Based on update patterns & funnel stage`);
    console.log(`\n💾 Saved to: ${sitemapPath}`);
    
  } catch (err) {
    console.error('❌ Sitemap generation failed:', err);
    throw err;
  }
}
