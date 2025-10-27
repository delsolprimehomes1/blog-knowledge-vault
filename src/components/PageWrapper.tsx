/**
 * PageWrapper: Enforces AEO/SEO standards on all pages
 * Automatically validates schemas, meta tags, and heading hierarchy
 */

import { useEffect, ReactNode } from 'react';
import { validateHeadingsOnLoad } from '@/lib/headingValidator';
import { validatePageAEO, logValidationErrors, calculateAEOScore, type SchemaRequirements } from '@/lib/schemaValidation';

interface PageWrapperProps {
  children: ReactNode;
  pageName: string;
  pageType?: 'article' | 'legal' | 'collection' | 'landing' | 'about';
  schemas?: any;
  meta?: {
    title?: string;
    description?: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    robots?: string;
  };
  validateSchemas?: boolean;
}

export function PageWrapper({
  children,
  pageName,
  pageType = 'landing',
  schemas = {},
  meta = {},
  validateSchemas = true,
}: PageWrapperProps) {
  
  useEffect(() => {
    // Validate heading hierarchy
    validateHeadingsOnLoad(pageName);

    // Validate schemas and meta tags
    if (validateSchemas && import.meta.env.DEV) {
      const requiredSchemas: SchemaRequirements = getRequiredSchemas(pageType);
      
      const errors = validatePageAEO(
        meta,
        schemas,
        requiredSchemas,
        pageName
      );

      logValidationErrors(errors, pageName);

      const score = calculateAEOScore(errors);
      console.log(`📊 AEO Score for ${pageName}: ${score}/100`);

      if (score < 70) {
        console.warn(`⚠️  ${pageName} has low AEO score. Consider addressing validation errors.`);
      }
    }
  }, [pageName, pageType, schemas, meta, validateSchemas]);

  return <>{children}</>;
}

/**
 * Define required schemas based on page type
 */
function getRequiredSchemas(pageType: string): SchemaRequirements {
  switch (pageType) {
    case 'article':
      return {
        webpage: true,
        organization: true,
        breadcrumb: true,
        speakable: true,
        faq: false, // Optional for articles
      };
    
    case 'legal':
      return {
        webpage: true,
        organization: true,
        breadcrumb: true,
        speakable: true,
        faq: true,
      };
    
    case 'collection':
      return {
        webpage: true,
        organization: true,
        breadcrumb: true,
        speakable: true,
        faq: false,
      };
    
    case 'about':
      return {
        webpage: true,
        organization: true,
        breadcrumb: true,
        speakable: true,
        faq: true,
      };
    
    case 'landing':
    default:
      return {
        webpage: true,
        organization: true,
        breadcrumb: false,
        speakable: false,
        faq: false,
      };
  }
}
