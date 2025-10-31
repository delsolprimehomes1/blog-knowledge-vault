/**
 * Home Page Schema Generator
 * Generates JSON-LD schemas for the homepage
 */

import { ORGANIZATION_SCHEMA } from './schemaGenerator';

const BASE_URL = 'https://delsolprimehomes.com';

export function generateHomePageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Del Sol Prime Homes | Costa del Sol Real Estate Experts",
    "description": "Licensed real estate agency specializing in Costa del Sol luxury properties. 35+ years expertise, multilingual support, verified by industry experts.",
    "url": `${BASE_URL}/`,
    "inLanguage": "en-GB",
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

export function generateAllHomeSchemas() {
  return {
    webPage: generateHomePageSchema(),
    organization: ORGANIZATION_SCHEMA,
    speakable: generateHomeSpeakableSchema(),
    breadcrumb: generateHomeBreadcrumbSchema()
  };
}
