import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ValidationResult {
  slug: string;
  exists: boolean;
  hasSchemas: boolean;
  hasContent: boolean;
  hasMeta: boolean;
  hasHreflang: boolean;
  hasCanonical: boolean;
  errors: string[];
  warnings: string[];
}

async function verifyStaticPages(distDir: string): Promise<void> {
  console.log('🔍 Verifying SSG deployment...\n');

  // Fetch published articles
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, title, status')
    .eq('status', 'published');

  if (error) {
    console.error('❌ Error fetching articles:', error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log('⚠️  No published articles found in database');
    return;
  }

  console.log(`📊 Found ${articles.length} published articles\n`);

  const results: ValidationResult[] = [];
  let totalValid = 0;
  let totalErrors = 0;

  for (const article of articles) {
    const result: ValidationResult = {
      slug: article.slug,
      exists: false,
      hasSchemas: false,
      hasContent: false,
      hasMeta: false,
      hasHreflang: false,
      hasCanonical: false,
      errors: [],
      warnings: [],
    };

    const htmlPath = resolve(distDir, 'blog', article.slug, 'index.html');

    // Check if file exists
    if (!existsSync(htmlPath)) {
      result.errors.push('Static HTML file not found');
      results.push(result);
      totalErrors++;
      continue;
    }

    result.exists = true;

    // Read HTML content
    const html = readFileSync(htmlPath, 'utf-8');

    // Check for JSON-LD schemas
    const schemaMatches = html.match(/<script type="application\/ld\+json">/g);
    result.hasSchemas = schemaMatches && schemaMatches.length >= 2; // At least Article + Breadcrumb
    if (!result.hasSchemas) {
      result.errors.push('Missing JSON-LD schemas (need at least 2)');
    }

    // Validate specific schemas
    if (html.includes('"@type":"BlogPosting"') || html.includes('"@type": "BlogPosting"')) {
      // Article schema found
    } else {
      result.errors.push('Missing BlogPosting schema');
    }

    if (html.includes('"@type":"BreadcrumbList"') || html.includes('"@type": "BreadcrumbList"')) {
      // Breadcrumb schema found
    } else {
      result.warnings.push('Missing BreadcrumbList schema');
    }

    // Check for article content
    const contentMatch = html.match(/<article[^>]*class="[^"]*article-content[^"]*"[^>]*>/);
    result.hasContent = !!contentMatch;
    if (!result.hasContent) {
      result.errors.push('Article content not found in HTML');
    }

    // Verify content is not just empty div
    if (result.hasContent) {
      const contentSection = html.substring(html.indexOf('<article'));
      const hasText = contentSection.length > 500; // At least 500 chars of content
      if (!hasText) {
        result.errors.push('Article content appears empty');
        result.hasContent = false;
      }
    }

    // Check for meta tags
    const hasTitleTag = html.includes('<title>') && !html.includes('<title>Vite');
    const hasMetaDescription = html.includes('<meta name="description"');
    const hasOgTags = html.includes('<meta property="og:title"');
    const hasTwitterCard = html.includes('<meta name="twitter:card"');

    result.hasMeta = hasTitleTag && hasMetaDescription && hasOgTags && hasTwitterCard;
    if (!hasTitleTag) result.errors.push('Missing or invalid title tag');
    if (!hasMetaDescription) result.errors.push('Missing meta description');
    if (!hasOgTags) result.warnings.push('Missing Open Graph tags');
    if (!hasTwitterCard) result.warnings.push('Missing Twitter Card tags');

    // Check for hreflang links
    result.hasHreflang = html.includes('hreflang=');
    if (!result.hasHreflang) {
      result.warnings.push('Missing hreflang tags (for translations)');
    }

    // Check for canonical URL
    result.hasCanonical = html.includes('<link rel="canonical"');
    if (!result.hasCanonical) {
      result.errors.push('Missing canonical URL');
    }

    // Determine if valid
    const isValid = result.exists && 
                   result.hasSchemas && 
                   result.hasContent && 
                   result.hasMeta && 
                   result.hasCanonical &&
                   result.errors.length === 0;

    if (isValid) {
      totalValid++;
    } else {
      totalErrors++;
    }

    results.push(result);
  }

  // Print results
  console.log('━'.repeat(80));
  console.log('📊 VERIFICATION RESULTS\n');

  // Summary
  console.log(`✅ Valid static pages: ${totalValid}/${articles.length}`);
  console.log(`❌ Invalid/missing pages: ${totalErrors}/${articles.length}`);
  console.log(`📈 Success rate: ${Math.round((totalValid / articles.length) * 100)}%\n`);

  // Detailed results
  if (totalErrors > 0) {
    console.log('━'.repeat(80));
    console.log('❌ ISSUES FOUND:\n');

    for (const result of results) {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`\n📄 ${result.slug}`);
        console.log(`   File exists: ${result.exists ? '✅' : '❌'}`);
        console.log(`   Has schemas: ${result.hasSchemas ? '✅' : '❌'}`);
        console.log(`   Has content: ${result.hasContent ? '✅' : '❌'}`);
        console.log(`   Has meta tags: ${result.hasMeta ? '✅' : '❌'}`);
        console.log(`   Has canonical: ${result.hasCanonical ? '✅' : '❌'}`);
        console.log(`   Has hreflang: ${result.hasHreflang ? '✅' : '⚠️ '}`);

        if (result.errors.length > 0) {
          console.log(`   🔴 Errors:`);
          result.errors.forEach(err => console.log(`      - ${err}`));
        }

        if (result.warnings.length > 0) {
          console.log(`   🟡 Warnings:`);
          result.warnings.forEach(warn => console.log(`      - ${warn}`));
        }
      }
    }
  } else {
    console.log('✨ All articles have valid static pages!');
  }

  console.log('\n' + '━'.repeat(80));

  // Schema validation summary
  const articlesWithSchemas = results.filter(r => r.hasSchemas).length;
  console.log(`\n📋 Schema Validation: ${articlesWithSchemas}/${articles.length} passed`);

  // Exit with error code if any failures
  if (totalErrors > 0) {
    console.log('\n⚠️  Some articles failed validation. Review errors above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ SSG deployment verified successfully!\n');
  }
}

// Run verification
const distDir = resolve(process.cwd(), 'dist');
verifyStaticPages(distDir).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
