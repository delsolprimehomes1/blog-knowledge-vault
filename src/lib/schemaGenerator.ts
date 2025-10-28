import { BlogArticle, Author } from "@/types/blog";

export interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface GeneratedSchemas {
  article: any;
  speakable: any;
  breadcrumb: any;
  faq?: any;
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
  "logo": "https://delsolprimehomes.com/logo.png",
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
            "position": 1
          },
          // Diagram image (secondary)
          {
            "@type": "ImageObject",
            "url": article.diagram_url,
            "contentUrl": article.diagram_url,
            "alternateName": article.diagram_alt || "Infographic diagram",
            "caption": article.diagram_caption || "Visual guide",
            "description": article.diagram_description || "Diagram illustrating key concepts",
            "representativeOfPage": false,
            "position": 2,
            "encodingFormat": "image/png",
            "contentType": "Infographic"
          }
        ]
      : {
          // Just featured image if no diagram
          "@type": "ImageObject",
          "url": article.featured_image_url,
          "contentUrl": article.featured_image_url,
          "caption": article.featured_image_caption || article.headline,
          "description": article.featured_image_alt || article.meta_description,
          "representativeOfPage": true
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
  
  if (author) {
    schema.author = generatePersonSchema(author);
  }
  
  if (reviewer) {
    schema.reviewedBy = generatePersonSchema(reviewer);
  }
  
  if (article.external_citations && article.external_citations.length > 0) {
    schema.citation = article.external_citations.map(citation => ({
      "@type": "CreativeWork",
      "name": citation.source,
      "url": citation.url
    }));
  }
  
  return { schema, errors };
}

export function generateSpeakableSchema(article: BlogArticle): any {
  const cssSelectors = [".speakable-answer", ".qa-summary"];
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
    "xpath": xpaths
  };
  
  // Add FAQ-specific metadata for better AI understanding
  if (article.faq_entities && article.faq_entities.length > 0) {
    schema.description = "This page contains an FAQ that directly answers the main question posed in the article title, optimized for voice assistants and AI reading.";
  }
  
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
        "representativeOfPage": true
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
        "contentType": "Infographic"
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

export function generateFAQSchema(
  article: BlogArticle,
  author: Author | null
): any | null {
  if (!article.faq_entities || article.faq_entities.length === 0) {
    return null;
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": article.faq_entities.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
        ...(author && { "author": generatePersonSchema(author) })
      },
      // Add speakable markup to each FAQ for AI/voice assistants
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".faq-question", ".faq-answer"]
      }
    })),
    // Add page-level speakable for better AI discovery
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".faq-section"],
      "xpath": ["/html/body/article/section[@class='faq-section']"]
    },
    "about": {
      "@type": "Article",
      "headline": article.headline,
      "description": article.meta_description
    }
  };
}

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
    "image": `${baseUrl}/logo.png`,
    "logo": `${baseUrl}/logo.png`,
    "url": baseUrl,
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
  const faq = generateFAQSchema(article, author);
  const organization = ORGANIZATION_SCHEMA;
  const localBusiness = generateLocalBusinessSchema(baseUrl);
  
  const validationErrors = validateSchemaRequirements(article);
  
  return {
    article: articleResult.schema,
    speakable,
    breadcrumb,
    faq,
    organization,
    localBusiness,
    errors: [...articleResult.errors, ...validationErrors]
  };
}

