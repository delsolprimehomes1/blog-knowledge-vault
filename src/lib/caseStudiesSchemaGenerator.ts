import { ORGANIZATION_SCHEMA } from './schemaGenerator';

const BASE_URL = 'https://delsolprimehomes.com';

export interface CaseStudy {
  id: string;
  title: string;
  location: string;
  propertyType: string;
  clientProfile: string;
  challenge: string;
  solution: string;
  outcome: string;
  timeline: string;
  testimonial: {
    quote: string;
    author: string;
    rating: number;
  };
  images: {
    before?: string;
    after: string;
  };
}

function generateCaseStudyImageSchema(url: string, propertyType: string, location: string): any {
  return {
    "@type": "ImageObject",
    "url": url,
    "contentUrl": url,
    "width": 1200,
    "height": 800,
    "encodingFormat": "image/jpeg",
    "caption": `${propertyType} in ${location}`,
    "description": `Professional photograph of ${propertyType.toLowerCase()} located in ${location}, Costa del Sol`,
    "representativeOfPage": false
  };
}

export function generateCaseStudySchema(caseStudy: CaseStudy): any {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/case-studies#${caseStudy.id}`,
    "name": `${caseStudy.title} - Del Sol Prime Homes`,
    "description": caseStudy.challenge,
    "image": generateCaseStudyImageSchema(caseStudy.images.after, caseStudy.propertyType, caseStudy.location),
    "provider": ORGANIZATION_SCHEMA,
    "areaServed": {
      "@type": "City",
      "name": caseStudy.location
    },
    "review": {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": caseStudy.testimonial.author
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": caseStudy.testimonial.rating,
        "bestRating": "5",
        "worstRating": "1"
      },
      "reviewBody": caseStudy.testimonial.quote,
      "datePublished": new Date().toISOString().split('T')[0],
      "itemReviewed": {
        "@type": "RealEstateAgent",
        "name": "Del Sol Prime Homes"
      }
    }
  };
}

export function generateCaseStudiesPageSchema(caseStudies: CaseStudy[]): any {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Real Estate Success Stories | Del Sol Prime Homes",
    "description": "Discover how we've helped international clients find their dream properties on Costa del Sol",
    "url": `${BASE_URL}/case-studies`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": caseStudies.map((cs, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": generateCaseStudySchema(cs)
      }))
    },
    "publisher": ORGANIZATION_SCHEMA
  };
}

export function generateCaseStudiesBreadcrumbSchema(): any {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": BASE_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Case Studies",
        "item": `${BASE_URL}/case-studies`
      }
    ]
  };
}
