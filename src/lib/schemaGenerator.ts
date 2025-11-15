import { BlogArticle, Author } from "@/types/blog";

// Banned competitor domains (shared with backend)
const BANNED_DOMAINS = [
  'idealista.com', 'fotocasa.es', 'pisos.com', 'habitaclia.com',
  'kyero.com', 'propertyguides.com', 'spanishpropertychoice.com',
  're-max.es', 'remax.com', 'engel-voelkers.com', 'engelvoelkers.com',
  'sothebysrealty.com', 'century21.es', 'century21.com',
  'spaansedroomhuizen.com', 'realestate-space.com', 'spaineasy.com',
  'investinspain.be', 'youroverseashome.com', 'amahomespain.com',
  'mdrluxuryhomes.com', 'immoabroad.com', 'casaaandecostablanca.nl',
  'mediterraneanhomes.eu', 'spainhomes.com', 'panoramamarbella.com',
  'spanjespecials.com', 'marbella-estates.com', 'hihomes.es',
];

export interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface GeneratedSchemas {
  article: any;
  speakable: any;
  breadcrumb: any;
  organization: any;
  localBusiness: any;
  errors: SchemaValidationError[];
}

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Del Sol Prime Homes",
  "description": "Premium real estate agency specializing in Costa del Sol properties",
  "url": "https://delsolprimehomes.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://delsolprimehomes.com/logo.png",
    "width": 250,
    "height": 80,
    "encodingFormat": "image/png",
    "caption": "Del Sol Prime Homes Logo"
  },
  "foundingDate": "1990",
  "slogan": "Costa del Sol Real Estate. Refined. Verified. Trusted.",
  "knowsAbout": [
    "Costa del Sol Real Estate",
    "International Property Sales",
    "Luxury Villa Sales",
    "Spanish Property Law",
    "Expatriate Relocation Services"
  ],
  "award": "API Certified Real Estate Agency",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle Alfonso XIII, 6-1º",
    "addressLocality": "Fuengirola",
    "addressRegion": "Costa del Sol",
    "addressCountry": "ES"
  },
  "areaServed": [
    { "@type": "City", "name": "Marbella" },
    { "@type": "City", "name": "Estepona" },
    { "@type": "City", "name": "Fuengirola" },
    { "@type": "City", "name": "Benalmádena" },
    { "@type": "City", "name": "Mijas" }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": ["en", "de", "nl", "fr", "pl", "sv", "da", "hu"],
    "telephone": "+34-613-578-416",
    "email": "info@delsolprimehomes.com"
  },
  "sameAs": [
    "https://www.facebook.com/example",
    "https://www.instagram.com/example",
    "https://www.linkedin.com/company/example"
  ]
};

export const LOCAL_BUSINESS_REVIEWED_ITEM = {
  "@type": "LocalBusiness",
  "@id": "https://delsolprimehomes.com/#organization",
  "name": "Del Sol Prime Homes",
  "url": "https://delsolprimehomes.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle Alfonso XIII, 6-1º",
    "addressLocality": "Fuengirola",
    "addressRegion": "Costa del Sol",
    "addressCountry": "ES"
  }
};

/**
 * Filter out banned competitor domains from citations
 */
export function filterBannedCitations(citations: any[]): any[] {
  if (!citations || !Array.isArray(citations)) return [];
  
  return citations.filter(citation => {
    try {
      const url = new URL(citation.url);
      const hostname = url.hostname.replace('www.', '').toLowerCase();
      
      // Check if hostname matches any banned domain
      return !BANNED_DOMAINS.some(banned => 
        hostname.includes(banned) || banned.includes(hostname)
      );
    } catch {
      // Invalid URL, filter it out
      return false;
    }
  });
}

export function generatePersonSchema(author: Author | null) {
  if (!author) return null;
  
  return {
    "@type": "Person",
    "name": author.name,
    "jobTitle": author.job_title,
    "description": author.bio,
    "image": author.photo_url,
    "url": author.linkedin_url,
    "knowsAbout": author.credentials,
    "hasCredential": author.credentials.map(cred => ({
      "@type": "EducationalOccupationalCredential",
      "name": cred
    }))
  };
}

export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWordsInHtml(html: string): number {
  const text = stripHtml(html);
  return text.split(/\s+/).filter(w => w).length;
}

export function extractParagraphIndex(content: string, citationUrl: string): number | null {
  if (!content || !citationUrl) return null;
  
  // Extract all <p> tags from HTML content
  const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gs) || [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    // Check for direct URL match or citation anchor tag with href
    if (paragraphs[i].includes(citationUrl) || 
        paragraphs[i].includes(`href="${citationUrl}"`)) {
      return i;
    }
  }
  
  return null;
}

export function generateArticleSchema(
  article: BlogArticle,
  author: Author | null,
  reviewer: Author | null,
  baseUrl: string = "https://example.com"
): any {
  const errors: SchemaValidationError[] = [];
  
  if (!article.headline) errors.push({ field: "headline", message: "Headline is required for schema", severity: "error" });
  if (!article.meta_description) errors.push({ field: "meta_description", message: "Meta description is required for schema", severity: "error" });
  if (!article.featured_image_url) errors.push({ field: "featured_image_url", message: "Featured image is required for schema", severity: "error" });
  if (!author) errors.push({ field: "author_id", message: "Author is required for schema", severity: "error" });
  
  const articleUrl = `${baseUrl}/${article.slug}`;
  const wordCount = countWordsInHtml(article.detailed_content);
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.headline,
    "description": article.meta_description,
    "inLanguage": article.language || "en",
    "image": article.diagram_url 
      ? [
          // Featured image (primary)
          {
            "@type": "ImageObject",
            "url": article.featured_image_url,
            "contentUrl": article.featured_image_url,
            "caption": article.featured_image_caption || article.headline,
            "description": article.featured_image_alt || article.meta_description,
            "representativeOfPage": true,
            "position": 1,
            "width": 1200,
            "height": 675,
            "encodingFormat": "image/jpeg",
            "thumbnail": {
              "@type": "ImageObject",
              "url": article.featured_image_url,
              "width": 400,
              "height": 225
            }
          },
          // Diagram image (secondary) with enhanced AI metadata
          {
            "@type": "ImageObject",
            "url": article.diagram_url,
            "contentUrl": article.diagram_url,
            "alternateName": article.diagram_alt || "Infographic diagram",
            "caption": article.diagram_caption || "Visual guide",
            "description": article.diagram_description || "Diagram illustrating key concepts",
            "representativeOfPage": false,
            "position": 2,
            "width": 1200,
            "height": 1200,
            "encodingFormat": "image/png",
            "contentType": "Infographic",
            // Enhanced metadata for AI/LLM understanding
            "inLanguage": article.language || "en",
            "accessMode": ["visual", "textual"],
            "accessibilityFeature": ["alternativeText", "longDescription"],
            "educationalUse": "explanation",
            "learningResourceType": "diagram",
            "isAccessibleForFree": true,
            "about": {
              "@type": "Thing",
              "name": article.category,
              "description": article.meta_description
            },
            "thumbnail": {
              "@type": "ImageObject",
              "url": article.diagram_url,
              "width": 400,
              "height": 400
            },
            "hasPart": {
              "@type": "WebPageElement",
              "cssSelector": "figure img[alt*='diagram'], figure img[alt*='infographic']",
              "position": "mid-article"
            }
          }
        ]
      : {
          // Just featured image if no diagram
          "@type": "ImageObject",
          "url": article.featured_image_url,
          "contentUrl": article.featured_image_url,
          "caption": article.featured_image_caption || article.headline,
          "description": article.featured_image_alt || article.meta_description,
          "representativeOfPage": true,
          "width": 1200,
          "height": 675,
          "encodingFormat": "image/jpeg",
          "thumbnail": {
            "@type": "ImageObject",
            "url": article.featured_image_url,
            "width": 400,
            "height": 225
          }
        },
    "datePublished": article.date_published,
    "dateModified": article.date_modified || article.date_published,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "publisher": ORGANIZATION_SCHEMA,
    "wordCount": wordCount,
    "articleBody": stripHtml(article.detailed_content).substring(0, 500) + "..."
  };
  
  // Add cluster relationship schema for AI engines
  if (article.cluster_id && (article as any).related_cluster_articles?.length > 0) {
    schema.isPartOf = {
      "@type": "CreativeWorkSeries",
      "name": `Content Cluster: ${(article as any).cluster_theme || 'Topic Cluster'}`,
      "identifier": article.cluster_id,
      "numberOfItems": (article as any).related_cluster_articles.length + 1,
      "about": {
        "@type": "Thing",
        "name": article.category
      }
    };
    
    // Add related articles as "relatedLink" for AI understanding
    schema.relatedLink = (article as any).related_cluster_articles.map((relatedArticle: any) => ({
      "@type": "WebPage",
      "name": relatedArticle.headline,
      "url": `${baseUrl}/blog/${relatedArticle.slug}`,
      "position": "mid-article",
      "inLanguage": article.language
    }));
  }
  
  if (author) {
    schema.author = generatePersonSchema(author);
  }
  
  if (reviewer) {
    schema.reviewedBy = generatePersonSchema(reviewer);
  }
  
  
  // Filter out banned competitor citations from schema
  const safeCitations = filterBannedCitations(article.external_citations || []);
  if (safeCitations.length > 0) {
    schema.citation = safeCitations.map((citation, index) => {
      // Extract paragraph index from article content
      const paragraphIndex = extractParagraphIndex(article.detailed_content, citation.url);
      
      return {
        "@type": "CreativeWork",
        "name": citation.source,
        "url": citation.url,
        "encodingFormat": "text/html",
        "isAccessibleForFree": true,
        "inLanguage": article.language,
        ...(paragraphIndex !== null && { 
          "position": `paragraph-${paragraphIndex}`,
          // Enhanced contextual relationship for AI engines (ChatGPT, Perplexity, Claude, SGE)
          "citation": {
            "@type": "Claim",
            "position": `inline-paragraph-${paragraphIndex}`,
            "appearance": "contextual-hyperlink",
            "isInline": true,
            "format": "According to {source} ({year})",
            "anchorText": citation.text || citation.source,
            "citationStyle": "APA-inline"
          }
        }),
        ...(citation.year && { 
          "datePublished": `${citation.year}-01-01` 
        }),
        ...(citation.sourceType && { 
          "genre": citation.sourceType 
        }),
        ...(citation.authorityScore && { 
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": (citation.authorityScore / 20).toFixed(1), // Convert 0-100 to 0-5
            "bestRating": "5",
            "worstRating": "0",
            "ratingExplanation": "Authority score based on domain reputation and source type"
          }
        }),
      };
    });
  }
  
  return { schema, errors };
}

export function generateSpeakableSchema(article: BlogArticle): any {
  const cssSelectors = [".speakable-answer", ".qa-summary", ".inline-citation"];
  const xpaths = ["/html/body/article/section[@class='speakable-answer']"];
  
  // Add FAQ selectors for AI/LLM optimization
  if (article.faq_entities && article.faq_entities.length > 0) {
    cssSelectors.push(".faq-section", ".faq-question", ".faq-answer");
    xpaths.push("/html/body/article/section[@class='faq-section']");
  }
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors,
    "xpath": xpaths,
    "inLanguage": article.language || "en"
  };
  
  // Add associated image for voice assistants and AI understanding
  if (article.featured_image_url || article.diagram_url) {
    const mediaArray = [];
    
    // Featured image
    if (article.featured_image_url) {
      mediaArray.push({
        "@type": "ImageObject",
        "url": article.featured_image_url,
        "description": article.featured_image_alt,
        "caption": article.featured_image_caption,
        "representativeOfPage": true,
        "width": 1200,
        "height": 675,
        "encodingFormat": "image/jpeg"
      });
    }
    
    // Diagram image
    if (article.diagram_url) {
      mediaArray.push({
        "@type": "ImageObject",
        "url": article.diagram_url,
        "alternateName": article.diagram_alt || "Infographic diagram",
        "caption": article.diagram_caption || "Visual guide",
        "description": article.diagram_description || "Diagram illustrating key concepts",
        "contentType": "Infographic",
        "width": 1200,
        "height": 1200,
        "encodingFormat": "image/png"
      });
    }
    
    schema.associatedMedia = mediaArray.length === 1 ? mediaArray[0] : mediaArray;
  }
  
  return schema;
}

export function generateBreadcrumbSchema(
  article: BlogArticle,
  baseUrl: string = "https://example.com"
): any {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${baseUrl}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.category || 'Uncategorized',
        "item": `${baseUrl}/blog/category/${(article.category || 'uncategorized').toString().toLowerCase().replace(/\s+/g, '-')}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": article.headline,
        "item": `${baseUrl}/${article.slug}`
      }
    ]
  };
}

// generateFAQSchema() removed - FAQs are now embedded in BlogPosting schema as mainEntity
// This prevents duplicate FAQPage errors in Google Search Console and improves AI readiness

export function validateSchemaRequirements(article: BlogArticle): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  
  // Critical errors - prevent proper schema generation
  if (!article.headline) errors.push({ field: "headline", message: "Required for Article schema", severity: "error" });
  if (!article.meta_description) errors.push({ field: "meta_description", message: "Required for Article schema", severity: "error" });
  if (!article.featured_image_url) errors.push({ field: "featured_image_url", message: "Required for Article schema", severity: "error" });
  if (!article.author_id) errors.push({ field: "author_id", message: "Author required for E-E-A-T signals", severity: "error" });
  if (!article.date_published && article.status === 'published') {
    errors.push({ field: "date_published", message: "Required for published Article schema", severity: "error" });
  }
  
  // Warnings - recommended improvements
  if (!article.reviewer_id) {
    errors.push({ field: "reviewer_id", message: "Add reviewer for enhanced E-E-A-T credibility", severity: "warning" });
  }
  if (!article.external_citations || article.external_citations.length < 2) {
    errors.push({ field: "external_citations", message: "Add 2+ citations for better trust signals", severity: "warning" });
  }
  if (!article.featured_image_alt) {
    errors.push({ field: "featured_image_alt", message: "Alt text improves accessibility and SEO", severity: "warning" });
  }
  
  // FAQ schema validation (if FAQ is enabled)
  if (article.faq_entities && article.faq_entities.length > 0) {
    article.faq_entities.forEach((faq, index) => {
      if (!faq.question) {
        errors.push({ field: `faq_entities[${index}].question`, message: "Question is required for FAQ schema", severity: "error" });
      }
      if (!faq.answer) {
        errors.push({ field: `faq_entities[${index}].answer`, message: "Answer is required for FAQ schema", severity: "error" });
      }
    });
  }
  
  return errors;
}

export function isAutoFixable(error: SchemaValidationError): boolean {
  // Only featured_image_alt can be auto-fixed
  return error.field === 'featured_image_alt' && error.severity === 'warning';
}

export function generateLocalBusinessSchema(baseUrl: string = "https://delsolprimehomes.com"): any {
  return {
    "@context": "https://schema.org",
    "@type": ["RealEstateAgent", "LocalBusiness"],
    "name": "Del Sol Prime Homes",
    "description": "Premium real estate agency specializing in Costa del Sol properties, offering expert guidance for foreign buyers and investors",
    "image": {
      "@type": "ImageObject",
      "url": `${baseUrl}/logo.png`,
      "width": 250,
      "height": 80,
      "encodingFormat": "image/png",
      "caption": "Del Sol Prime Homes Logo"
    },
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/logo.png`,
      "width": 250,
      "height": 80,
      "encodingFormat": "image/png",
      "caption": "Del Sol Prime Homes Logo"
    },
    "url": baseUrl,
    "foundingDate": "1990",
    "slogan": "Costa del Sol Real Estate. Refined. Verified. Trusted.",
    "telephone": "+34-613-578-416",
    "email": "info@delsolprimehomes.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Calle Alfonso XIII, 6-1º",
      "addressLocality": "Fuengirola",
      "addressRegion": "Málaga",
      "postalCode": "29640",
      "addressCountry": "ES"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 36.5397,
      "longitude": -4.6262
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      }
    ],
    "priceRange": "€€€",
    "areaServed": [
      { "@type": "City", "name": "Marbella" },
      { "@type": "City", "name": "Estepona" },
      { "@type": "City", "name": "Fuengirola" },
      { "@type": "City", "name": "Benalmádena" },
      { "@type": "City", "name": "Mijas" },
      { "@type": "City", "name": "Torremolinos" },
      { "@type": "City", "name": "Málaga" }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "telephone": "+34-613-578-416",
      "email": "info@delsolprimehomes.com",
      "availableLanguage": ["en", "de", "nl", "fr", "pl", "sv", "da", "hu"]
    },
    "sameAs": [
      baseUrl
    ]
  };
}

export function generateAllSchemas(
  article: BlogArticle,
  author: Author | null,
  reviewer: Author | null,
  baseUrl: string = "https://delsolprimehomes.com"
): GeneratedSchemas {
  const articleResult = generateArticleSchema(article, author, reviewer, baseUrl);
  const speakable = generateSpeakableSchema(article);
  const breadcrumb = generateBreadcrumbSchema(article, baseUrl);
  const organization = ORGANIZATION_SCHEMA;
  const localBusiness = generateLocalBusinessSchema(baseUrl);
  
  const validationErrors = validateSchemaRequirements(article);
  
  return {
    article: articleResult.schema,
    speakable,
    breadcrumb,
    organization,
    localBusiness,
    errors: [...articleResult.errors, ...validationErrors]
  };
}

