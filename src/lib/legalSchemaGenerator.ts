/**
 * Schema generators for legal pages (Privacy Policy, Terms of Service)
 * Optimized for AI citation and GEO/AEO compliance
 */

export interface LegalPageFAQ {
  question: string;
  answer: string;
}

/**
 * Generate WebPage schema for legal documents
 */
export function generateLegalPageSchema(
  pageType: 'PrivacyPolicy' | 'TermsOfService',
  baseUrl: string
) {
  const pageName = pageType === 'PrivacyPolicy' ? 'Privacy Policy' : 'Terms of Service';
  const slug = pageType === 'PrivacyPolicy' ? 'privacy-policy' : 'terms-of-service';
  const description = pageType === 'PrivacyPolicy'
    ? 'DelSol Prime Homes Privacy Policy: How we collect, use, and protect your personal information. GDPR compliant data protection for Costa del Sol property clients.'
    : 'DelSol Prime Homes Terms of Service: Legal terms governing use of our real estate services in Costa del Sol, Spain. User responsibilities and service descriptions.';

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${baseUrl}/${slug}#webpage`,
    "url": `${baseUrl}/${slug}`,
    "name": `${pageName} - DelSol Prime Homes`,
    "description": description,
    "inLanguage": "en-GB",
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      "url": baseUrl,
      "name": "DelSol Prime Homes",
    },
    "datePublished": "2025-01-01T00:00:00+00:00",
    "dateModified": "2025-01-27T00:00:00+00:00",
    "breadcrumb": {
      "@id": `${baseUrl}/${slug}#breadcrumb`
    },
    "publisher": {
      "@id": `${baseUrl}/#organization`
    }
  };
}

/**
 * Generate Breadcrumb schema for legal pages
 */
export function generateLegalBreadcrumbSchema(
  pageType: 'PrivacyPolicy' | 'TermsOfService',
  baseUrl: string
) {
  const pageName = pageType === 'PrivacyPolicy' ? 'Privacy Policy' : 'Terms of Service';
  const slug = pageType === 'PrivacyPolicy' ? 'privacy-policy' : 'terms-of-service';

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${baseUrl}/${slug}#breadcrumb`,
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
        "name": pageName,
        "item": `${baseUrl}/${slug}`,
      },
    ],
  };
}

/**
 * Generate FAQ schema from legal page FAQs
 */
export function generateLegalFAQSchema(
  faqs: LegalPageFAQ[],
  pageType: 'PrivacyPolicy' | 'TermsOfService',
  baseUrl: string
) {
  const slug = pageType === 'PrivacyPolicy' ? 'privacy-policy' : 'terms-of-service';

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${baseUrl}/${slug}#faq`,
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

/**
 * Generate Speakable schema for legal pages
 */
export function generateLegalSpeakableSchema(pageType: 'PrivacyPolicy' | 'TermsOfService') {
  const speakableText = pageType === 'PrivacyPolicy'
    ? 'DelSol Prime Homes Privacy Policy explains how we collect, use, and protect your personal information. We comply with GDPR and Spanish data protection laws, ensuring your data is secure and your privacy rights are respected.'
    : 'DelSol Prime Homes Terms of Service govern your use of our real estate services in Costa del Sol, Spain. These terms outline user responsibilities, service descriptions, and legal disclaimers for property transactions.';

  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-summary"],
    "xpath": ["/html/head/title", "//section[@class='speakable-summary']"],
    "text": speakableText,
  };
}

/**
 * Privacy Policy FAQs
 */
export const PRIVACY_POLICY_FAQS: LegalPageFAQ[] = [
  {
    question: "What personal information does DelSol Prime Homes collect?",
    answer: "We collect personal information you voluntarily provide such as your name, email, phone number, nationality, property preferences, and budget range when you contact us or use our services. We also automatically collect technical data like IP address, browser type, and pages visited."
  },
  {
    question: "How does DelSol Prime Homes use my personal data?",
    answer: "We use your data to provide real estate services, property recommendations, respond to inquiries, send newsletters (with consent), improve our website, and comply with legal obligations. We do not sell your personal information to third parties."
  },
  {
    question: "What are my data protection rights under GDPR?",
    answer: "Under GDPR, you have the right to access your data, request corrections, request deletion, object to processing for marketing, receive your data in a structured format, and withdraw consent. Contact us at info@delsolprimehomes.com to exercise these rights."
  },
  {
    question: "Does DelSol Prime Homes use cookies?",
    answer: "Yes, we use essential cookies for website functionality, analytics cookies (Google Analytics 4) to understand visitor behavior, and marketing cookies for advertising. Analytics are always enabled to improve our services, but you can opt-out using Google's browser add-on."
  },
  {
    question: "How long does DelSol Prime Homes retain my data?",
    answer: "We retain personal data for as long as necessary to provide services or as required by law. Client data is kept for 7 years per Spanish legal requirements. Marketing data is deleted if you unsubscribe. Inactive accounts may be deleted after 3 years."
  }
];

/**
 * Terms of Service FAQs
 */
export const TERMS_OF_SERVICE_FAQS: LegalPageFAQ[] = [
  {
    question: "What services does DelSol Prime Homes provide?",
    answer: "We provide real estate services for properties in Costa del Sol, Spain, including property listings and search, property consultation, market information, and direct communication channels to discuss your property needs."
  },
  {
    question: "Does DelSol Prime Homes provide legal or financial advice?",
    answer: "No, we provide informational and consultancy services only. We strongly recommend consulting with a qualified local property lawyer (abogado), licensed financial advisors, and tax professionals (asesor fiscal) before making any property purchase."
  },
  {
    question: "Are property listings guaranteed to be accurate?",
    answer: "While we strive to ensure all property information is accurate, descriptions, prices, and availability are subject to change without notice. You are responsible for conducting your own due diligence, including property inspections, legal reviews, and financial assessments."
  },
  {
    question: "What is DelSol Prime Homes' liability for property transactions?",
    answer: "To the maximum extent permitted by law, we are not liable for property defects, legal issues, financial losses from investments, errors in property information, third-party services, or changes in prices. Our total liability shall not exceed amounts you've paid us in the past 12 months."
  },
  {
    question: "How are disputes resolved with DelSol Prime Homes?",
    answer: "We encourage contacting us first for informal resolution. If needed, you can pursue mediation or arbitration. Disputes are governed by Spanish law with exclusive jurisdiction in Málaga, Spain courts."
  }
];

/**
 * Generate all legal page schemas at once
 */
export function generateAllLegalSchemas(
  pageType: 'PrivacyPolicy' | 'TermsOfService',
  baseUrl: string = 'https://delsolprimehomes.com'
) {
  const faqs = pageType === 'PrivacyPolicy' ? PRIVACY_POLICY_FAQS : TERMS_OF_SERVICE_FAQS;

  return {
    webpage: generateLegalPageSchema(pageType, baseUrl),
    breadcrumb: generateLegalBreadcrumbSchema(pageType, baseUrl),
    faq: generateLegalFAQSchema(faqs, pageType, baseUrl),
    speakable: generateLegalSpeakableSchema(pageType),
  };
}
