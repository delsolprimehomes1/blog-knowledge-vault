import { ORGANIZATION_SCHEMA, generateLocalBusinessSchema } from "./schemaGenerator";

export interface AboutPageFAQ {
  question: string;
  answer: string;
}

const BASE_URL = "https://delsolprimehomes.com";

export function generateAboutPageSchema(): any {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Del Sol Prime Homes",
    "description": "Del Sol Prime Homes is a licensed real estate agency specializing in Costa del Sol properties for international buyers. Multilingual team speaking 8 languages with local expertise.",
    "url": `${BASE_URL}/about`,
    "mainEntity": generateLocalBusinessSchema(BASE_URL),
    "dateModified": new Date().toISOString().split('T')[0],
    "inLanguage": "en-GB",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL
    }
  };
}

export function generateAboutSpeakableSchema(): any {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-answer", ".speakable-mission"],
    "xpath": ["/html/body/div/section[@class='speakable-answer']"]
  };
}

export function generateAboutBreadcrumbSchema(): any {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${BASE_URL}/blog`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "About",
        "item": `${BASE_URL}/about`
      }
    ]
  };
}

export function generateAboutFAQSchema(faqs: AboutPageFAQ[]): any {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
        "author": {
          "@type": "Organization",
          "name": "Del Sol Prime Homes"
        }
      }
    }))
  };
}

export function generateServicesSchema(): any {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "Service",
        "position": 1,
        "name": "Property Search & Selection",
        "description": "Expert assistance finding the perfect property matching your criteria across Costa del Sol",
        "provider": ORGANIZATION_SCHEMA
      },
      {
        "@type": "Service",
        "position": 2,
        "name": "Legal & Financial Guidance",
        "description": "Comprehensive support with legal documentation, contracts, and financial arrangements",
        "provider": ORGANIZATION_SCHEMA
      },
      {
        "@type": "Service",
        "position": 3,
        "name": "Multilingual Support",
        "description": "Communication in 8 languages: English, German, Dutch, French, Polish, Swedish, Danish, and Hungarian",
        "provider": ORGANIZATION_SCHEMA
      },
      {
        "@type": "Service",
        "position": 4,
        "name": "Property Management",
        "description": "Ongoing property management and maintenance services for international owners",
        "provider": ORGANIZATION_SCHEMA
      }
    ]
  };
}

export function generateServiceAreaSchema(): any {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Service Areas",
    "itemListElement": [
      {
        "@type": "Place",
        "position": 1,
        "name": "Marbella",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.5095,
          "longitude": -4.8853
        }
      },
      {
        "@type": "Place",
        "position": 2,
        "name": "Estepona",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.4279,
          "longitude": -5.1448
        }
      },
      {
        "@type": "Place",
        "position": 3,
        "name": "Fuengirola",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.5397,
          "longitude": -4.6262
        }
      },
      {
        "@type": "Place",
        "position": 4,
        "name": "Benalmádena",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.5993,
          "longitude": -4.5160
        }
      },
      {
        "@type": "Place",
        "position": 5,
        "name": "Mijas",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.5963,
          "longitude": -4.6379
        }
      },
      {
        "@type": "Place",
        "position": 6,
        "name": "Torremolinos",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.6202,
          "longitude": -4.4999
        }
      },
      {
        "@type": "Place",
        "position": 7,
        "name": "Málaga",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 36.7213,
          "longitude": -4.4214
        }
      }
    ]
  };
}

export const ABOUT_PAGE_FAQS: AboutPageFAQ[] = [
  {
    question: "What languages does Del Sol Prime Homes speak?",
    answer: "Our multilingual team speaks 8 languages: English, German, Dutch, French, Polish, Swedish, Danish, and Hungarian. This ensures clear communication throughout your property journey on the Costa del Sol."
  },
  {
    question: "Where is Del Sol Prime Homes located?",
    answer: "We are located at Calle Alfonso XIII, 6-1º, Fuengirola, Costa del Sol, Spain. We serve the entire Costa del Sol region including Marbella, Estepona, Fuengirola, Benalmádena, Mijas, Torremolinos, and Málaga."
  },
  {
    question: "What services does Del Sol Prime Homes offer?",
    answer: "We offer comprehensive real estate services including property search and selection, legal and financial guidance, multilingual support in 8 languages, and ongoing property management for international owners. We guide you through every step from initial consultation to post-purchase support."
  },
  {
    question: "Do you help with legal paperwork for property purchases?",
    answer: "Yes, we provide comprehensive legal assistance throughout the purchase process. We work with trusted legal experts and guide you through all documentation, contracts, NIE numbers, notary appointments, and property registration to ensure a smooth and secure transaction."
  },
  {
    question: "What areas of Costa del Sol do you cover?",
    answer: "We cover the entire Costa del Sol region including Marbella, Estepona, Fuengirola, Benalmádena, Mijas, Torremolinos, and Málaga. Our local expertise extends to both coastal properties and inland areas across this beautiful region."
  },
  {
    question: "Why should international buyers choose Del Sol Prime Homes?",
    answer: "We specialize in serving international clients with deep local expertise, multilingual support (8 languages), personalized service, and established relationships with legal and financial experts. We understand the unique needs of foreign buyers and provide transparent guidance throughout your property journey."
  },
  {
    question: "What are your business hours?",
    answer: "We are open Monday through Friday from 9:00 AM to 6:00 PM. You can reach us by phone at +34-613-578-416 or by email at info@delsolprimehomes.com. We're happy to arrange consultations outside regular hours by appointment."
  }
];

export function generateAllAboutSchemas() {
  return {
    aboutPage: generateAboutPageSchema(),
    speakable: generateAboutSpeakableSchema(),
    breadcrumb: generateAboutBreadcrumbSchema(),
    faq: generateAboutFAQSchema(ABOUT_PAGE_FAQS),
    organization: ORGANIZATION_SCHEMA,
    localBusiness: generateLocalBusinessSchema(BASE_URL),
    services: generateServicesSchema(),
    serviceArea: generateServiceAreaSchema()
  };
}
