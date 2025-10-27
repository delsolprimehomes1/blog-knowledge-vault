/**
 * usePageSchema: Hook for generating page schemas
 * Provides easy access to schema generators for different page types
 */

import { useMemo } from 'react';
import { ORGANIZATION_SCHEMA } from '@/lib/schemaGenerator';
import { generateAllLegalSchemas } from '@/lib/legalSchemaGenerator';
import { generateAllBlogIndexSchemas } from '@/lib/blogIndexSchemaGenerator';
import { generateAllAboutSchemas } from '@/lib/aboutSchemaGenerator';

interface UsePageSchemaProps {
  pageType: 'legal-privacy' | 'legal-terms' | 'blog-index' | 'about' | 'custom';
  baseUrl?: string;
  customSchemas?: any;
}

export function usePageSchema({
  pageType,
  baseUrl = 'https://delsolprimehomes.com',
  customSchemas = {},
}: UsePageSchemaProps) {
  
  const schemas = useMemo(() => {
    let generated: any = {};

    switch (pageType) {
      case 'legal-privacy':
        generated = generateAllLegalSchemas('PrivacyPolicy', baseUrl);
        break;
      
      case 'legal-terms':
        generated = generateAllLegalSchemas('TermsOfService', baseUrl);
        break;
      
      case 'blog-index':
        generated = generateAllBlogIndexSchemas([], baseUrl);
        break;
      
      case 'about':
        generated = generateAllAboutSchemas();
        break;
      
      case 'custom':
        generated = customSchemas;
        break;
    }

    // Always include organization schema
    return {
      ...generated,
      organization: ORGANIZATION_SCHEMA,
    };
  }, [pageType, baseUrl, customSchemas]);

  return schemas;
}
