#!/bin/bash

echo "🚀 Setting up SSG Verification Script..."
echo ""

# Navigate to project directory
cd ~/Projects/delsol-prime-gateway

# Create scripts directory
echo "📁 Creating scripts directory..."
mkdir -p scripts

# Copy verification script
echo "📝 Creating verification script..."
cat > scripts/verifySsgDeployment.ts << 'VERIFICATIONSCRIPT'
#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface ValidationResult {
  slug: string;
  url: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  schemas: {
    blogPosting: boolean;
    realEstateAgent: boolean;
    breadcrumbList: boolean;
    faqPage: boolean;
    speakable: boolean;
    entityLinking: boolean;
  };
  metaTags: {
    title: boolean;
    description: boolean;
    ogTags: boolean;
    twitterCard: boolean;
    canonical: boolean;
  };
  aeoScore: number;
}

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(\`\${colors.red}\${colors.bold}❌ Error: Supabase credentials not found in environment variables\${colors.reset}\`);
  console.error(\`\${colors.yellow}Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your .env file\${colors.reset}\`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getPublishedArticles() {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('slug, headline, language')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(\`\${colors.red}Error fetching articles:\${colors.reset}\`, error);
    return [];
  }

  return data || [];
}

function validateHtmlFile(slug: string): ValidationResult {
  const result: ValidationResult = {
    slug,
    url: \`/blog/\${slug}\`,
    valid: true,
    errors: [],
    warnings: [],
    schemas: {
      blogPosting: false,
      realEstateAgent: false,
      breadcrumbList: false,
      faqPage: false,
      speakable: false,
      entityLinking: false,
    },
    metaTags: {
      title: false,
      description: false,
      ogTags: false,
      twitterCard: false,
      canonical: false,
    },
    aeoScore: 0,
  };

  const htmlPath = path.join(process.cwd(), 'dist', 'blog', slug, 'index.html');
  
  if (!fs.existsSync(htmlPath)) {
    result.valid = false;
    result.errors.push(\`HTML file not found at \${htmlPath}\`);
    return result;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const root = parse(html);

  const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
  const schemas: any[] = [];

  jsonLdScripts.forEach((script) => {
    try {
      const schemaData = JSON.parse(script.innerHTML);
      schemas.push(schemaData);
    } catch (e) {
      result.errors.push('Invalid JSON-LD schema found');
    }
  });

  schemas.forEach((schema) => {
    const type = schema['@type'];
    
    if (type === 'BlogPosting') {
      result.schemas.blogPosting = true;
      if (!schema.headline) result.warnings.push('BlogPosting missing headline');
      if (!schema.author) result.warnings.push('BlogPosting missing author');
      if (!schema.datePublished) result.warnings.push('BlogPosting missing datePublished');
    }
    
    if (type === 'RealEstateAgent') {
      result.schemas.realEstateAgent = true;
    }
    
    if (type === 'BreadcrumbList') {
      result.schemas.breadcrumbList = true;
    }
    
    if (type === 'FAQPage') {
      result.schemas.faqPage = true;
    }

    if (schema.speakable) {
      result.schemas.speakable = true;
    }

    if (schema.author?.['@id'] || schema.publisher?.['@id']) {
      result.schemas.entityLinking = true;
    }
  });

  const titleTag = root.querySelector('title');
  const metaDescription = root.querySelector('meta[name="description"]');
  const ogTitle = root.querySelector('meta[property="og:title"]');
  const ogDescription = root.querySelector('meta[property="og:description"]');
  const ogImage = root.querySelector('meta[property="og:image"]');
  const twitterCard = root.querySelector('meta[name="twitter:card"]');
  const canonical = root.querySelector('link[rel="canonical"]');

  result.metaTags.title = !!titleTag && titleTag.text.length > 0;
  result.metaTags.description = !!metaDescription && metaDescription.getAttribute('content')!.length > 0;
  result.metaTags.ogTags = !!(ogTitle && ogDescription && ogImage);
  result.metaTags.twitterCard = !!twitterCard;
  result.metaTags.canonical = !!canonical;

  const articleContent = root.querySelector('article') || root.querySelector('[role="article"]');
  if (!articleContent || articleContent.text.length < 500) {
    result.warnings.push('Article content appears too short or missing');
  }

  if (!result.schemas.blogPosting) {
    result.errors.push('Missing BlogPosting schema');
    result.valid = false;
  }

  if (!result.schemas.realEstateAgent) {
    result.errors.push('Missing RealEstateAgent schema');
    result.valid = false;
  }

  if (!result.schemas.breadcrumbList) {
    result.warnings.push('Missing BreadcrumbList schema (recommended)');
  }

  if (!result.schemas.faqPage) {
    result.warnings.push('Missing FAQPage schema (recommended if article has FAQs)');
  }

  if (!result.schemas.speakable) {
    result.warnings.push('Missing SpeakableSpecification (recommended for voice search)');
  }

  if (!result.schemas.entityLinking) {
    result.warnings.push('Missing entity linking (@id references in schemas)');
  }

  if (!result.metaTags.title) {
    result.errors.push('Missing title tag');
    result.valid = false;
  }

  if (!result.metaTags.description) {
    result.errors.push('Missing meta description');
    result.valid = false;
  }

  if (!result.metaTags.canonical) {
    result.warnings.push('Missing canonical URL');
  }

  if (!result.metaTags.ogTags) {
    result.warnings.push('Incomplete Open Graph tags');
  }

  if (!result.metaTags.twitterCard) {
    result.warnings.push('Missing Twitter Card meta tag');
  }

  let score = 0;
  
  if (result.schemas.blogPosting) score += 20;
  if (result.schemas.realEstateAgent) score += 20;
  if (result.metaTags.title) score += 10;
  if (result.metaTags.description) score += 10;

  if (result.schemas.breadcrumbList) score += 10;
  if (result.schemas.faqPage) score += 5;
  if (result.schemas.entityLinking) score += 5;
  if (result.metaTags.canonical) score += 5;
  if (result.metaTags.ogTags) score += 5;

  if (result.schemas.speakable) score += 5;
  if (result.metaTags.twitterCard) score += 5;

  result.aeoScore = score;

  return result;
}

function printResults(results: ValidationResult[]) {
  console.log(\`\\n\${colors.bold}\${colors.cyan}========================================\${colors.reset}\`);
  console.log(\`\${colors.bold}\${colors.cyan}   SSG DEPLOYMENT VERIFICATION\${colors.reset}\`);
  console.log(\`\${colors.bold}\${colors.cyan}========================================\${colors.reset}\\n\`);

  const validPages = results.filter((r) => r.valid).length;
  const totalPages = results.length;
  const successRate = totalPages > 0 ? ((validPages / totalPages) * 100).toFixed(1) : '0';
  const avgScore = totalPages > 0 ? (results.reduce((sum, r) => sum + r.aeoScore, 0) / totalPages).toFixed(0) : '0';

  console.log(\`\${colors.bold}📊 SUMMARY\${colors.reset}\`);
  console.log(\`\${'─'.repeat(40)}\`);
  console.log(\`\${colors.green}✅ Valid static pages: \${validPages}/\${totalPages}\${colors.reset}\`);
  console.log(\`\${colors.blue}📈 Success rate: \${successRate}%\${colors.reset}\`);
  console.log(\`\${colors.cyan}🎯 Average AEO Readiness Score: \${avgScore}/100\${colors.reset}\\n\`);

  const schemaStats = {
    blogPosting: results.filter((r) => r.schemas.blogPosting).length,
    realEstateAgent: results.filter((r) => r.schemas.realEstateAgent).length,
    breadcrumbList: results.filter((r) => r.schemas.breadcrumbList).length,
    faqPage: results.filter((r) => r.schemas.faqPage).length,
    speakable: results.filter((r) => r.schemas.speakable).length,
    entityLinking: results.filter((r) => r.schemas.entityLinking).length,
  };

  console.log(\`\${colors.bold}📋 SCHEMA VALIDATION\${colors.reset}\`);
  console.log(\`\${'─'.repeat(40)}\`);
  console.log(\`\${colors.green}✅ BlogPosting: \${schemaStats.blogPosting}/\${totalPages}\${colors.reset}\`);
  console.log(\`\${colors.green}✅ RealEstateAgent: \${schemaStats.realEstateAgent}/\${totalPages}\${colors.reset}\`);
  console.log(\`\${colors.blue}📍 BreadcrumbList: \${schemaStats.breadcrumbList}/\${totalPages}\${colors.reset}\`);
  console.log(\`\${colors.blue}❓ FAQPage: \${schemaStats.faqPage}/\${totalPages}\${colors.reset}\`);
  console.log(\`\${colors.blue}🔊 SpeakableSpecification: \${schemaStats.speakable}/\${totalPages}\${colors.reset}\`);
  console.log(\`\${colors.blue}🔗 Entity Linking (@id): \${schemaStats.entityLinking}/\${totalPages}\${colors.reset}\\n\`);

  const failedPages = results.filter((r) => !r.valid);
  if (failedPages.length > 0) {
    console.log(\`\${colors.bold}\${colors.red}❌ FAILED PAGES (\${failedPages.length})\${colors.reset}\`);
    console.log(\`\${'─'.repeat(40)}\`);
    
    failedPages.forEach((page) => {
      console.log(\`\\n\${colors.red}\${colors.bold}/\${page.slug}\${colors.reset}\`);
      console.log(\`  AEO Score: \${page.aeoScore}/100\`);
      
      if (page.errors.length > 0) {
        console.log(\`  \${colors.red}Errors:\${colors.reset}\`);
        page.errors.forEach((err) => console.log(\`    • \${err}\`));
      }
      
      if (page.warnings.length > 0) {
        console.log(\`  \${colors.yellow}Warnings:\${colors.reset}\`);
        page.warnings.forEach((warn) => console.log(\`    • \${warn}\`));
      }
    });
    console.log();
  }

  const pagesWithWarnings = results.filter((r) => r.valid && r.warnings.length > 0);
  if (pagesWithWarnings.length > 0) {
    console.log(\`\${colors.bold}\${colors.yellow}⚠️  PAGES WITH WARNINGS (\${pagesWithWarnings.length})\${colors.reset}\`);
    console.log(\`\${'─'.repeat(40)}\`);
    
    pagesWithWarnings.slice(0, 5).forEach((page) => {
      console.log(\`\\n\${colors.yellow}/\${page.slug}\${colors.reset}\`);
      console.log(\`  AEO Score: \${page.aeoScore}/100\`);
      page.warnings.forEach((warn) => console.log(\`    • \${warn}\`));
    });
    
    if (pagesWithWarnings.length > 5) {
      console.log(\`\\n  ... and \${pagesWithWarnings.length - 5} more pages with warnings\`);
    }
    console.log();
  }

  console.log(\`\${'═'.repeat(40)}\`);
  if (validPages === totalPages) {
    console.log(\`\${colors.green}\${colors.bold}✅ SSG deployment verified successfully!\${colors.reset}\`);
    console.log(\`\${colors.green}🚀 Ready for production deployment.\${colors.reset}\\n\`);
  } else {
    console.log(\`\${colors.red}\${colors.bold}❌ SSG deployment has issues!\${colors.reset}\`);
    console.log(\`\${colors.yellow}⚠️  Please fix the errors above before deploying.\${colors.reset}\\n\`);
    process.exit(1);
  }
}

async function main() {
  console.log(\`\${colors.cyan}🔍 Fetching published articles from Supabase...\${colors.reset}\`);
  
  const articles = await getPublishedArticles();
  
  if (articles.length === 0) {
    console.log(\`\${colors.yellow}⚠️  No published articles found in database.\${colors.reset}\`);
    console.log(\`\${colors.yellow}Make sure you have articles with status='published' in your blog_articles table.\${colors.reset}\`);
    process.exit(0);
  }

  console.log(\`\${colors.green}✓ Found \${articles.length} published article(s)\${colors.reset}\\n\`);
  console.log(\`\${colors.cyan}🔍 Validating static HTML files in dist/blog/...\${colors.reset}\\n\`);

  const results: ValidationResult[] = [];

  for (const article of articles) {
    const result = validateHtmlFile(article.slug);
    results.push(result);
    
    const statusIcon = result.valid ? '✓' : '✗';
    const statusColor = result.valid ? colors.green : colors.red;
    console.log(\`  \${statusColor}\${statusIcon} /\${article.slug}\${colors.reset} (Score: \${result.aeoScore}/100)\`);
  }

  printResults(results);
}

main().catch((error) => {
  console.error(\`\${colors.red}\${colors.bold}Fatal error:\${colors.reset}\`, error);
  process.exit(1);
});
VERIFICATIONSCRIPT

echo "✅ Verification script created!"
echo ""

# Add npm script
echo "📝 Adding npm script to package.json..."
npm pkg set scripts.verify-ssg="tsx scripts/verifySsgDeployment.ts"

echo "✅ npm script added!"
echo ""

# Install dependencies
echo "📦 Installing required dependencies..."
npm install --save-dev tsx node-html-parser

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now run: npm run verify-ssg"
echo ""
