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
  hasBlogPosting: boolean;
  hasRealEstateAgent: boolean;
  hasBreadcrumbList: boolean;
  hasFAQPage: boolean;
  hasSpeakable: boolean;
  hasEntityLinking: boolean;
  aeoScore: number;
  errors: string[];
  warnings: string[];
}

async function verifyStaticPages(distDir: string): Promise<void> {
  console.log('🔍 Verifying SSG deployment...\n');

  // Fetch published articles
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, headline, status')
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
      hasBlogPosting: false,
      hasRealEstateAgent: false,
      hasBreadcrumbList: false,
      hasFAQPage: false,
      hasSpeakable: false,
      hasEntityLinking: false,
      aeoScore: 0,
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
    const schemaCount = schemaMatches ? schemaMatches.length : 0;
    result.hasSchemas = schemaCount >= 3; // Minimum: BlogPosting + RealEstateAgent + BreadcrumbList
    
    if (schemaCount < 3) {
      result.errors.push(`Only ${schemaCount} schemas found (need at least 3)`);
    }

    // Extract all JSON-LD blocks
    const schemaBlocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    const schemas = schemaBlocks.map(block => {
      try {
        const json = block.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
        return JSON.parse(json);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Check for BlogPosting
    result.hasBlogPosting = schemas.some(s => s['@type'] === 'BlogPosting');
    if (!result.hasBlogPosting) {
      result.errors.push('Missing BlogPosting schema');
    }

    // Check for RealEstateAgent (Organization)
    result.hasRealEstateAgent = schemas.some(s => s['@type'] === 'RealEstateAgent');
    if (!result.hasRealEstateAgent) {
      result.errors.push('Missing RealEstateAgent schema');
    }

    // Check for BreadcrumbList
    result.hasBreadcrumbList = schemas.some(s => s['@type'] === 'BreadcrumbList');
    if (!result.hasBreadcrumbList) {
      result.warnings.push('Missing BreadcrumbList schema');
    }

    // Check for FAQPage
    result.hasFAQPage = schemas.some(s => s['@type'] === 'FAQPage');
    if (!result.hasFAQPage) {
      result.warnings.push('Missing FAQPage schema (recommended for AEO)');
    }

    // Check for SpeakableSpecification
    result.hasSpeakable = schemas.some(s => s['@type'] === 'SpeakableSpecification');
    if (!result.hasSpeakable) {
      result.warnings.push('Missing SpeakableSpecification schema (recommended for voice)');
    }

    // Validate entity linking (@id references)
    const orgSchema = schemas.find(s => s['@type'] === 'RealEstateAgent');
    const articleSchema = schemas.find(s => s['@type'] === 'BlogPosting');
    
    let entityLinkingIssues = 0;

    if (orgSchema && !orgSchema['@id']) {
      result.warnings.push('RealEstateAgent missing @id');
      entityLinkingIssues++;
    }

    if (articleSchema) {
      if (!articleSchema['@id']) {
        result.warnings.push('BlogPosting missing @id');
        entityLinkingIssues++;
      }
      
      if (!articleSchema.publisher || !articleSchema.publisher['@id']) {
        result.warnings.push('BlogPosting publisher missing @id reference');
        entityLinkingIssues++;
      }
      
      if (!articleSchema.author || !articleSchema.author['@id']) {
        result.warnings.push('BlogPosting author missing @id reference');
        entityLinkingIssues++;
      }
    }

    result.hasEntityLinking = entityLinkingIssues === 0;

    // Validate speakable content exists if schema present
    if (result.hasSpeakable) {
      const hasSpeakableContent = html.includes('class="speakable-answer"') || 
                                  html.includes('class="article-intro"');
      if (!hasSpeakableContent) {
        result.warnings.push('SpeakableSpecification present but no .speakable-answer or .article-intro in HTML');
      }
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

    // Calculate AEO Readiness Score (0-100)
    let score = 0;
    
    // Schema completeness (40 points)
    if (result.hasBlogPosting) score += 10;
    if (result.hasRealEstateAgent) score += 10;
    if (result.hasBreadcrumbList) score += 8;
    if (result.hasFAQPage) score += 6;
    if (result.hasSpeakable) score += 6;
    
    // Entity linking (30 points)
    if (result.hasEntityLinking) score += 30;
    
    // Meta tags (15 points)
    if (result.hasMeta) score += 15;
    
    // Content structure (15 points)
    if (result.hasContent) score += 7.5;
    if (result.hasCanonical) score += 7.5;
    
    result.aeoScore = Math.round(score);

    // Determine if valid
    const isValid = result.exists && 
                   result.hasSchemas && 
                   result.hasContent && 
                   result.hasMeta && 
                   result.hasCanonical &&
                   result.hasBlogPosting &&
                   result.hasRealEstateAgent &&
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
  console.log(`📈 Success rate: ${Math.round((totalValid / articles.length) * 100)}%`);
  
  // Calculate average AEO score
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.aeoScore, 0) / results.length);
  console.log(`🎯 Average AEO Readiness Score: ${avgScore}/100\n`);

  // Schema breakdown
  const blogPostingCount = results.filter(r => r.hasBlogPosting).length;
  const realEstateAgentCount = results.filter(r => r.hasRealEstateAgent).length;
  const breadcrumbCount = results.filter(r => r.hasBreadcrumbList).length;
  const faqCount = results.filter(r => r.hasFAQPage).length;
  const speakableCount = results.filter(r => r.hasSpeakable).length;
  const entityLinkingCount = results.filter(r => r.hasEntityLinking).length;

  console.log('📋 Schema Validation:');
  console.log(`   ✅ BlogPosting: ${blogPostingCount}/${articles.length}`);
  console.log(`   ✅ RealEstateAgent: ${realEstateAgentCount}/${articles.length}`);
  console.log(`   ✅ BreadcrumbList: ${breadcrumbCount}/${articles.length}`);
  console.log(`   ${faqCount === articles.length ? '✅' : '⚠️ '} FAQPage: ${faqCount}/${articles.length}`);
  console.log(`   ${speakableCount === articles.length ? '✅' : '⚠️ '} SpeakableSpecification: ${speakableCount}/${articles.length}`);
  console.log(`   ${entityLinkingCount === articles.length ? '✅' : '⚠️ '} Entity Linking (@id): ${entityLinkingCount}/${articles.length}\n`);

  // Detailed results
  if (totalErrors > 0 || results.some(r => r.warnings.length > 0)) {
    console.log('━'.repeat(80));
    console.log('📝 DETAILED RESULTS:\n');

    for (const result of results) {
      if (result.errors.length > 0 || result.warnings.length > 0 || result.aeoScore < 80) {
        console.log(`\n📄 ${result.slug}`);
        console.log(`   AEO Score: ${result.aeoScore}/100 ${result.aeoScore >= 90 ? '🌟' : result.aeoScore >= 80 ? '✅' : result.aeoScore >= 60 ? '⚠️' : '❌'}`);
        console.log(`   File exists: ${result.exists ? '✅' : '❌'}`);
        console.log(`   BlogPosting: ${result.hasBlogPosting ? '✅' : '❌'}`);
        console.log(`   RealEstateAgent: ${result.hasRealEstateAgent ? '✅' : '❌'}`);
        console.log(`   BreadcrumbList: ${result.hasBreadcrumbList ? '✅' : '⚠️ '}`);
        console.log(`   FAQPage: ${result.hasFAQPage ? '✅' : '⚠️ '}`);
        console.log(`   Speakable: ${result.hasSpeakable ? '✅' : '⚠️ '}`);
        console.log(`   Entity Linking: ${result.hasEntityLinking ? '✅' : '⚠️ '}`);
        console.log(`   Content: ${result.hasContent ? '✅' : '❌'}`);
        console.log(`   Meta tags: ${result.hasMeta ? '✅' : '❌'}`);
        console.log(`   Canonical: ${result.hasCanonical ? '✅' : '❌'}`);
        console.log(`   Hreflang: ${result.hasHreflang ? '✅' : '⚠️ '}`);

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
    console.log('✨ All articles have valid static pages with optimal schemas!');
  }

  console.log('\n' + '━'.repeat(80));

  // AEO readiness summary
  const excellentCount = results.filter(r => r.aeoScore >= 90).length;
  const goodCount = results.filter(r => r.aeoScore >= 80 && r.aeoScore < 90).length;
  const fairCount = results.filter(r => r.aeoScore >= 60 && r.aeoScore < 80).length;
  const poorCount = results.filter(r => r.aeoScore < 60).length;

  console.log('\n🎯 AEO READINESS BREAKDOWN:');
  console.log(`   🌟 Excellent (90-100): ${excellentCount}`);
  console.log(`   ✅ Good (80-89): ${goodCount}`);
  console.log(`   ⚠️  Fair (60-79): ${fairCount}`);
  console.log(`   ❌ Poor (<60): ${poorCount}`);

  // Exit with error code if any failures
  if (totalErrors > 0) {
    console.log('\n⚠️  Critical errors found. Fix issues above before deploying.\n');
    process.exit(1);
  } else if (avgScore < 80) {
    console.log('\n⚠️  AEO score below 80. Consider adding FAQPage and improving entity linking.\n');
    console.log('💡 Tip: Add FAQ sections and ensure all schemas have @id references.\n');
  } else {
    console.log('\n✅ SSG deployment verified successfully!\n');
    console.log('🚀 Ready for production deployment.\n');
  }
}

// Run verification
const distDir = resolve(process.cwd(), 'dist');
verifyStaticPages(distDir).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
