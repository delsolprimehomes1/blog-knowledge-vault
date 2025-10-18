import { BlogArticle, Author } from "@/types/blog";

interface SchemaValidationError {
  field: string;
  message: string;
}

export interface GeneratedSchemas {
  article: any;
  speakable: any;
  breadcrumb: any;
  faq?: any;
  organization: any;
  errors: SchemaValidationError[];
}

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Del Sol Prime Homes",
  "description": "Premium real estate agency specializing in Costa del Sol properties",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
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
    "availableLanguage": ["en", "es", "de", "nl", "fr", "pl", "sv", "da", "hu"],
    "telephone": "+34-XXX-XXX-XXX",
    "email": "info@example.com"
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
  
  if (!article.headline) errors.push({ field: "headline", message: "Headline is required for schema" });
  if (!article.meta_description) errors.push({ field: "meta_description", message: "Meta description is required for schema" });
  if (!article.featured_image_url) errors.push({ field: "featured_image_url", message: "Featured image is required for schema" });
  if (!author) errors.push({ field: "author_id", message: "Author is required for schema" });
  
  const articleUrl = `${baseUrl}/${article.slug}`;
  const wordCount = countWordsInHtml(article.detailed_content);
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.headline,
    "description": article.meta_description,
    "image": {
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
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-answer", ".qa-summary"],
    "xpath": ["/html/body/article/section[@class='speakable-answer']"]
  };
  
  // Add associated image for voice assistants and AI understanding
  if (article.featured_image_url) {
    schema.associatedMedia = {
      "@type": "ImageObject",
      "url": article.featured_image_url,
      "description": article.featured_image_alt,
      "caption": article.featured_image_caption
    };
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
        "name": article.category,
        "item": `${baseUrl}/blog/category/${(article.category || 'uncategorized').toLowerCase().replace(/\s+/g, '-')}`
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
      }
    }))
  };
}

export function validateSchemaRequirements(article: BlogArticle): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  
  // Article schema validation
  if (!article.headline) errors.push({ field: "headline", message: "Required for Article schema" });
  if (!article.meta_description) errors.push({ field: "meta_description", message: "Required for Article schema" });
  if (!article.featured_image_url) errors.push({ field: "featured_image_url", message: "Required for Article schema" });
  if (!article.author_id) errors.push({ field: "author_id", message: "Required for Article schema" });
  if (!article.date_published && article.status === 'published') {
    errors.push({ field: "date_published", message: "Required for published Article schema" });
  }
  
  // FAQ schema validation (if FAQ is enabled)
  if (article.faq_entities && article.faq_entities.length > 0) {
    article.faq_entities.forEach((faq, index) => {
      if (!faq.question) {
        errors.push({ field: `faq_entities[${index}].question`, message: "Question is required for FAQ schema" });
      }
      if (!faq.answer) {
        errors.push({ field: `faq_entities[${index}].answer`, message: "Answer is required for FAQ schema" });
      }
    });
  }
  
  return errors;
}

export function generateAllSchemas(
  article: BlogArticle,
  author: Author | null,
  reviewer: Author | null,
  baseUrl: string = "https://example.com"
): GeneratedSchemas {
  const articleResult = generateArticleSchema(article, author, reviewer, baseUrl);
  const speakable = generateSpeakableSchema(article);
  const breadcrumb = generateBreadcrumbSchema(article, baseUrl);
  const faq = generateFAQSchema(article, author);
  const organization = ORGANIZATION_SCHEMA;
  
  const validationErrors = validateSchemaRequirements(article);
  
  return {
    article: articleResult.schema,
    speakable,
    breadcrumb,
    faq,
    organization,
    errors: [...articleResult.errors, ...validationErrors]
  };
}

export function injectSchemas(schemas: GeneratedSchemas): string {
  const scripts: string[] = [];
  
  scripts.push(`<script type="application/ld+json">${JSON.stringify(schemas.article)}</script>`);
  scripts.push(`<script type="application/ld+json">${JSON.stringify(schemas.speakable)}</script>`);
  scripts.push(`<script type="application/ld+json">${JSON.stringify(schemas.breadcrumb)}</script>`);
  
  if (schemas.faq) {
    scripts.push(`<script type="application/ld+json">${JSON.stringify(schemas.faq)}</script>`);
  }
  
  scripts.push(`<script type="application/ld+json">${JSON.stringify(schemas.organization)}</script>`);
  
  return scripts.join('\n');
}
