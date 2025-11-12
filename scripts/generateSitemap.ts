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
}

/**
 * Calculate priority based on funnel stage and recency
 */
function calculatePriority(article: SitemapArticle): string {
  let priority = 0.8;
  
  // Base priority on funnel stage
  if (article.funnel_stage === 'BOFU') {
    priority = 1.0;
  } else if (article.funnel_stage === 'MOFU') {
    priority = 0.9;
  } else {
    priority = 0.8;
  }
  
  // Boost recently updated articles
  const lastModDate = article.date_modified || article.date_published;
  if (lastModDate) {
    const daysSinceUpdate = (Date.now() - new Date(lastModDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      priority = Math.min(1.0, priority + 0.1);
    }
  }
  
  return priority.toFixed(1);
}

/**
 * Calculate change frequency based on funnel stage
 */
function calculateChangeFreq(article: SitemapArticle): 'daily' | 'weekly' | 'monthly' {
  if (article.funnel_stage === 'BOFU') {
    return 'daily'; // BOFU content needs to stay current
  } else if (article.funnel_stage === 'MOFU') {
    return 'weekly';
  }
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
 * Generate sitemap URL entry with optional image
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
  
  xml += '  </url>\n';
  return xml;
}

/**
 * Generate static pages URLs
 */
function generateStaticPages(): SitemapUrl[] {
  const today = new Date().toISOString().split('T')[0];
  
  return [
    {
      loc: `${BASE_URL}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0'
    },
    {
      loc: `${BASE_URL}/about`,
      changefreq: 'monthly',
      priority: '0.9'
    },
    {
      loc: `${BASE_URL}/blog`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.9'
    },
    {
      loc: `${BASE_URL}/faq`,
      changefreq: 'monthly',
      priority: '0.9'
    },
    {
      loc: `${BASE_URL}/qa`,
      changefreq: 'monthly',
      priority: '0.9'
    },
    {
      loc: `${BASE_URL}/case-studies`,
      changefreq: 'monthly',
      priority: '0.8'
    },
    {
      loc: `${BASE_URL}/privacy-policy`,
      lastmod: '2025-01-27',
      changefreq: 'yearly',
      priority: '0.5'
    },
    {
      loc: `${BASE_URL}/terms-of-service`,
      lastmod: '2025-01-27',
      changefreq: 'yearly',
      priority: '0.5'
    }
  ];
}

/**
 * Generate category page URLs
 */
function generateCategoryPages(): SitemapUrl[] {
  const categories = [
    'buying-guides',
    'investment-strategies',
    'legal-regulations',
    'location-insights',
    'market-analysis',
    'property-management'
  ];
  
  return categories.map(category => ({
    loc: `${BASE_URL}/blog/category/${category}`,
    changefreq: 'weekly' as const,
    priority: '0.8'
  }));
}

export async function generateSitemap(distDir: string) {
  console.log('\n🗺️  Starting sitemap generation...');
  
  try {
    // Fetch all published articles
    const { data: articles, error } = await supabase
      .from('blog_articles')
      .select('slug, date_modified, date_published, funnel_stage, featured_image_url, featured_image_alt, featured_image_caption, headline')
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

    // Generate sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
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

    xml += '\n  <!-- Blog Articles -->\n';
    
    // Add article URLs with images
    let articleCount = 0;
    for (const article of articles as SitemapArticle[]) {
      const articleUrl: SitemapUrl = {
        loc: `${BASE_URL}/blog/${article.slug}`,
        lastmod: formatDate(article.date_modified || article.date_published),
        changefreq: calculateChangeFreq(article),
        priority: calculatePriority(article),
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

    console.log(`\n✨ Sitemap generation complete!`);
    console.log(`   📄 Static pages: ${staticPages.length}`);
    console.log(`   📂 Category pages: ${categoryPages.length}`);
    console.log(`   📝 Blog articles: ${articleCount}`);
    console.log(`   🖼️  Images included: ${articleCount}`);
    console.log(`   📊 Total URLs: ${staticPages.length + categoryPages.length + articleCount}`);
    console.log(`   💾 Saved to: ${sitemapPath}`);
    
    // Calculate coverage
    const coverage = ((articleCount / articles.length) * 100).toFixed(1);
    console.log(`   ✅ Coverage: ${coverage}% (${articleCount}/${articles.length} articles)`);
    
  } catch (err) {
    console.error('❌ Sitemap generation failed:', err);
    throw err;
  }
}
