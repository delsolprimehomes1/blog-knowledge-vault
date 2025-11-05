/**
 * Home Page Schema Generator
 * Generates JSON-LD schemas for the homepage
 */

import { ORGANIZATION_SCHEMA } from './schemaGenerator';
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

export function generateHomeReviewsSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "Review",
        "position": 1,
        "author": { "@type": "Person", "name": "James & Sarah M." },
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5", "worstRating": "1" },
        "reviewBody": "Our experience buying in Marbella was incredible. The team guided us through every step, from viewings to final paperwork. Their multilingual support made everything seamless.",
        "datePublished": "2024-11-01",
        "itemReviewed": { "@type": "RealEstateAgent", "name": "Del Sol Prime Homes" }
      },
      {
        "@type": "Review",
        "position": 2,
        "author": { "@type": "Person", "name": "Henrik L." },
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5", "worstRating": "1" },
        "reviewBody": "Professional, knowledgeable, and genuinely caring. They found us the perfect villa in Estepona and handled all the legal complexities with ease.",
        "datePublished": "2024-09-15",
        "itemReviewed": { "@type": "RealEstateAgent", "name": "Del Sol Prime Homes" }
      }
    ]
  };
}

export function generateAllHomeSchemas() {
  return {
    webPage: generateHomePageSchema(),
    organization: ORGANIZATION_SCHEMA,
    speakable: generateHomeSpeakableSchema(),
    breadcrumb: generateHomeBreadcrumbSchema(),
    reviews: generateHomeReviewsSchema(),
    imageGallery: generateImageGallerySchema(),
    heroImages: getAllHeroImageSchemas()
  };
}
