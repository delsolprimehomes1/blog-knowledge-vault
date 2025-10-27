/**
 * Schema validation utility for AEO/SEO compliance
 * Validates that pages have required structured data and meta tags
 */

export interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PageMetaRequirements {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  robots?: string;
  language?: string;
}

export interface SchemaRequirements {
  webpage?: boolean;
  organization?: boolean;
  breadcrumb?: boolean;
  speakable?: boolean;
  faq?: boolean;
}

/**
 * Validate page meta tags
 */
export function validatePageMeta(
  meta: Partial<PageMetaRequirements>,
  pageName: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (!meta.title) {
    errors.push({
      field: 'title',
      message: `${pageName}: Missing page title`,
      severity: 'error',
    });
  } else if (meta.title.length > 60) {
    errors.push({
      field: 'title',
      message: `${pageName}: Title exceeds 60 characters (${meta.title.length} chars)`,
      severity: 'warning',
    });
  }

  if (!meta.description) {
    errors.push({
      field: 'description',
      message: `${pageName}: Missing meta description`,
      severity: 'error',
    });
  } else if (meta.description.length > 160) {
    errors.push({
      field: 'description',
      message: `${pageName}: Description exceeds 160 characters (${meta.description.length} chars)`,
      severity: 'warning',
    });
  }

  if (!meta.canonical) {
    errors.push({
      field: 'canonical',
      message: `${pageName}: Missing canonical URL`,
      severity: 'error',
    });
  }

  if (!meta.ogTitle || !meta.ogDescription) {
    errors.push({
      field: 'openGraph',
      message: `${pageName}: Missing Open Graph tags`,
      severity: 'warning',
    });
  }

  if (!meta.robots) {
    errors.push({
      field: 'robots',
      message: `${pageName}: Missing robots meta tag`,
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate required schemas are present
 */
export function validateSchemas(
  providedSchemas: any,
  required: SchemaRequirements,
  pageName: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (required.webpage && !providedSchemas.webpage) {
    errors.push({
      field: 'schema.webpage',
      message: `${pageName}: Missing WebPage schema`,
      severity: 'error',
    });
  }

  if (required.organization && !providedSchemas.organization) {
    errors.push({
      field: 'schema.organization',
      message: `${pageName}: Missing Organization schema`,
      severity: 'warning',
    });
  }

  if (required.breadcrumb && !providedSchemas.breadcrumb) {
    errors.push({
      field: 'schema.breadcrumb',
      message: `${pageName}: Missing Breadcrumb schema`,
      severity: 'warning',
    });
  }

  if (required.speakable && !providedSchemas.speakable) {
    errors.push({
      field: 'schema.speakable',
      message: `${pageName}: Missing Speakable schema`,
      severity: 'warning',
    });
  }

  if (required.faq && !providedSchemas.faq) {
    errors.push({
      field: 'schema.faq',
      message: `${pageName}: Missing FAQ schema`,
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Complete page validation (meta + schemas)
 */
export function validatePageAEO(
  meta: Partial<PageMetaRequirements>,
  schemas: any,
  requiredSchemas: SchemaRequirements,
  pageName: string
): SchemaValidationError[] {
  const metaErrors = validatePageMeta(meta, pageName);
  const schemaErrors = validateSchemas(schemas, requiredSchemas, pageName);

  return [...metaErrors, ...schemaErrors];
}

/**
 * Log validation errors to console (dev mode only)
 */
export function logValidationErrors(errors: SchemaValidationError[], pageName: string) {
  if (import.meta.env.DEV && errors.length > 0) {
    console.group(`🔍 AEO Validation: ${pageName}`);
    
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    if (errorCount > 0) {
      console.error(`❌ ${errorCount} error(s) found:`);
      errors.filter(e => e.severity === 'error').forEach(e => {
        console.error(`  - ${e.field}: ${e.message}`);
      });
    }

    if (warningCount > 0) {
      console.warn(`⚠️  ${warningCount} warning(s) found:`);
      errors.filter(e => e.severity === 'warning').forEach(e => {
        console.warn(`  - ${e.field}: ${e.message}`);
      });
    }

    console.groupEnd();
  }
}

/**
 * Get AEO compliance score (0-100)
 */
export function calculateAEOScore(errors: SchemaValidationError[]): number {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const totalPenalty = (errorCount * 10) + (warningCount * 5);
  const score = Math.max(0, 100 - totalPenalty);

  return score;
}
