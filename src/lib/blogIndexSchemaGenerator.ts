/**
 * Schema generators for Blog Index page
 * Optimized for AI citation and GEO/AEO compliance
 */

import type { BlogArticle } from "@/types/blog";

/**
 * Generate CollectionPage schema for blog listing
 */
export function generateBlogCollectionSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/blog#collectionpage`,
    "url": `${baseUrl}/blog`,
    "name": "Costa del Sol Property Blog - Expert Insights & Guides",
    "description": "Comprehensive guides on buying property in Costa del Sol, Spain. Expert insights on real estate market trends, legal procedures, investment opportunities, and lifestyle tips for international buyers.",
    "inLanguage": "en-GB",
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      "url": baseUrl,
      "name": "DelSol Prime Homes",
    },
    "breadcrumb": {
      "@id": `${baseUrl}/blog#breadcrumb`
    },
    "publisher": {
      "@id": `${baseUrl}/#organization`
    }
  };
}

/**
 * Generate Breadcrumb schema for blog index
 */
export function generateBlogIndexBreadcrumbSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${baseUrl}/blog#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${baseUrl}/blog`,
      },
    ],
  };
}

/**
 * Generate ItemList schema for blog articles
 */
export function generateBlogItemListSchema(
  articles: BlogArticle[],
  baseUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${baseUrl}/blog#itemlist`,
    "itemListElement": articles.slice(0, 20).map((article, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${baseUrl}/blog/${article.slug}`,
      "name": article.headline,
      "description": article.meta_description || article.headline,
      "image": article.featured_image_url,
      "datePublished": article.date_published,
    })),
  };
}

/**
 * Generate Speakable schema for blog index
 */
export function generateBlogIndexSpeakableSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".blog-hero-description", ".speakable-summary"],
    "xpath": ["/html/head/title", "//div[@class='blog-hero-description']"],
    "text": "DelSol Prime Homes Blog: Your comprehensive guide to buying property in Costa del Sol, Spain. Expert insights on real estate market trends, legal procedures, investment opportunities, and lifestyle tips for international buyers from UK, Ireland, and across Europe.",
  };
}

/**
 * Generate all blog index schemas at once
 */
export function generateAllBlogIndexSchemas(
  articles: BlogArticle[] = [],
  baseUrl: string = 'https://delsolprimehomes.com'
) {
  return {
    collection: generateBlogCollectionSchema(baseUrl),
    breadcrumb: generateBlogIndexBreadcrumbSchema(baseUrl),
    itemList: articles.length > 0 ? generateBlogItemListSchema(articles, baseUrl) : null,
    speakable: generateBlogIndexSpeakableSchema(),
  };
}
