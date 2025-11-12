/**
 * Home Page Schema Generator
 * Generates JSON-LD schemas for the homepage
 */

import { ORGANIZATION_SCHEMA, LOCAL_BUSINESS_REVIEWED_ITEM } from './schemaGenerator';
import { generateImageGallerySchema, getAllHeroImageSchemas } from './heroImageSchemas';

const BASE_URL = 'https://delsolprimehomes.com';

export function generateHomePageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Del Sol Prime Homes | Costa del Sol Real Estate Experts",
    "description": "Licensed real estate agency specializing in Costa del Sol luxury properties. 35+ years expertise, multilingual support, verified by industry experts.",
    "url": `${BASE_URL}/`,
    "inLanguage": "en-GB",
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": `${BASE_URL}/images/costa-del-sol-beauty.jpg`,
      "width": 1920,
      "height": 1080
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL
    },
    "about": {
      "@type": "RealEstateAgent",
      "name": "Del Sol Prime Homes",
      "description": "Premier real estate agency on the Costa del Sol"
    },
    "mainEntity": [
      {
        "@type": "AboutPage",
        "name": "About Del Sol Prime Homes",
        "url": `${BASE_URL}/about`
      },
      {
        "@type": "FAQPage",
        "name": "Frequently Asked Questions",
        "url": `${BASE_URL}/faq`
      },
      {
        "@type": "Blog",
        "name": "Real Estate Blog & Insights",
        "url": `${BASE_URL}/blog`
      },
      {
        "@type": "QAPage",
        "name": "Questions & Answers",
        "url": `${BASE_URL}/qa`
      }
    ],
    "publisher": ORGANIZATION_SCHEMA
  };
}

export function generateHomeSpeakableSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-headline", ".speakable-summary"]
  };
}

export function generateHomeBreadcrumbSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": BASE_URL
      }
    ]
  };
}

/**
 * TODO: Add real, verified customer reviews
 * 
 * Requirements:
 * - Must be actual customer testimonials with written consent
 * - Must include real dates and verifiable details
 * - Consider integrating with Google Reviews API or Trustpilot
 * 
 * See: https://developers.google.com/search/docs/appearance/structured-data/review-snippet
 */

export function generateAllHomeSchemas() {
  return {
    webPage: generateHomePageSchema(),
    organization: ORGANIZATION_SCHEMA,
    speakable: generateHomeSpeakableSchema(),
    breadcrumb: generateHomeBreadcrumbSchema(),
    imageGallery: generateImageGallerySchema(),
    heroImages: getAllHeroImageSchemas()
  };
}
